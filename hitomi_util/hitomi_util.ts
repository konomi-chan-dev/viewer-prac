import PQueue from "p-queue";
import type { ImageInfo, GalleryInfo, GallerySearchOption } from "./types";
import ky from 'ky';

function getFetchOptions() {
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
        'Referer': 'https://hitomi.la/'
    }
}

const api = ky.create({
    retry: {
        limit: 5,
        backoffLimit: 3000
    },
    headers: getFetchOptions(),
    timeout: 10000
});

const HITOMI_ROOT = 'https://hitomi.la/'
const RESOURCE_ROOT = 'https://ltn.gold-usergeneratedcontent.net';
const GGJS_URL = `${RESOURCE_ROOT}/gg.js`;
const domain2 = 'gold-usergeneratedcontent.net';

export let gg = {
  m(g: number) {
    return 0
  },
  s(h: string) {},
  b: ''
}

export let galleryinfo: GalleryInfo = {
    related: [],
    galleryurl: '',
    files: [],
    language_localname: '',
    blocked: false,
    tags: [],
    title: '',
    language: '',
    type: "",
    language_url: "",
    date: "",
    groups: null,
    artists: null,
    parodys: null,
    characters: null
};

export async function downloadGGJS(): Promise<void> {
    const res = await api.get(GGJS_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch gg.js: ${res.status} ${res.statusText}`);
    }
    
    eval(await res.text());
}

export async function downloadGalleryInfoJS(bookId: number): Promise<void> {
    const res = await api.get(`${RESOURCE_ROOT}/galleries/${bookId}.js`);
    if (!res.ok) {
        throw new Error(`Failed to fetch gallery info JS for book ID ${bookId}: ${res.status} ${res.statusText}`);
    }
    let galleryInfoJS = await res.text();
    galleryInfoJS = galleryInfoJS.replace('var ', '');
    eval(galleryInfoJS);
}

export async function downloadBookImages(bookId: number, concurrency: number = 10): Promise<string[]> {
    try{
        await downloadGGJS();
    }catch(error){
        console.error(error);
        return [];
    }

    try{
        await downloadGalleryInfoJS(bookId);
    }catch(error){
        console.error(error);
        return [];
    }

    console.log(galleryinfo);

    for (const image of galleryinfo.files) {
        const imageUrl = url_from_url_from_hash(bookId, image, 'webp', '', '');
        const res = await api.get(imageUrl);
        console.log(res.status, res.statusText);
        
        if (res.ok) {
            await Bun.write(`./images/${image.hash}.webp`, await res.arrayBuffer());
            console.log('Downloaded image:', imageUrl);
        }
        else{
            console.error(`Failed to download image: ${imageUrl} - ${res.status} ${res.statusText}`);
        }
    }

    const queue = new PQueue({concurrency: concurrency});

    const taks = galleryinfo.files.map((image) => {
        return queue.add(async () => {
            const imageUrl = url_from_url_from_hash(bookId, image, 'webp', '', '');
            const res = await api.get(imageUrl);
            
        });
    });

    return [];
}

export async function collectGalleryIds(target: GallerySearchOption) {
    let galleryURL = makeGalleryURL(target);
    try {
        const res = await api.get(galleryURL.url, { headers: galleryURL.header });
        if (!res.ok) {
            throw new Error(`Failed to fetch gallery page: ${res.status} ${res.statusText}`);
        }

        const dataView = new DataView(await res.arrayBuffer());
        const total = dataView.byteLength / 4;
        const galleryIds: number[] = [];
        for(let i = 0; i < total; i++){
            galleryIds.push(dataView.getInt32(i * 4, false));
        }
        return galleryIds;

    } catch (error) {
        console.error('Error collecting gallery IDs:', error);
    }
    return [];
}

export function makeGalleryURL(searchOption: GallerySearchOption) {
    let url = RESOURCE_ROOT + '/';
    if(searchOption.type !== 'all'){
        url += searchOption.type + '/';
    }
    if(searchOption.populer !== ''){
        url += 'popular/'
        if (searchOption.type !== 'all'){
            url += searchOption.populer + '/';
        }
    }
    url += searchOption.type === 'all' ? searchOption.populer : searchOption.name;
    url += `-${searchOption.language}.nozomi`;

    url += '?page=' + searchOption.page;

    let header: Record<string, string> = getFetchOptions();
    const startByte = (searchOption.page - 1) * 25 * 4;
    const endByte = startByte + 25 * 4 - 1;
    header['Range'] = `bytes=${startByte}-${endByte}`;

    return {
        url: url,
        header: header
    }
}

export function url_from_url_from_hash(galleryid: number, image: ImageInfo, dir: string, ext: string, base: string) {
        if ('tn' === base) {
                return url_from_url('https://a.'+domain2+'/'+dir+'/'+real_full_path_from_hash(image.hash)+'.'+ext, base, '');
        }
        return url_from_url(url_from_hash(galleryid, image, dir, ext), base, dir);
}

function url_from_hash(galleryid: number, image: ImageInfo, dir: string, ext: string) {
        ext = ext || dir || image.name.split('.').pop() || '';
        if (dir === 'webp' || dir === 'avif') {
                dir = '';
        } else {
                dir += '/';
        }
        
        return 'https://a.'+domain2+'/'+dir+full_path_from_hash(image.hash)+'.'+ext;
}

function full_path_from_hash(hash: string) {
        return gg.b+gg.s(hash)+'/'+hash;
}

function url_from_url(url: string, base: string, dir: string) {
    return url.replace(/\/\/..?\.(?:gold-usergeneratedcontent\.net|hitomi\.la)\//, '//'+subdomain_from_url(url, base, dir)+'.'+domain2+'/');
}

function real_full_path_from_hash(hash: string) {
        return hash.replace(/^.*(..)(.)$/, '$2/$1/'+hash);
}

function subdomain_from_url(url:string, base:string, dir:string) {
        var retval = '';
        if (!base) {
                if (dir === 'webp') {
                        retval = 'w';
                } else if (dir === 'avif') {
                        retval = 'a';
                }
        }
        
        var b = 16;
        
        var r = /\/[0-9a-f]{61}([0-9a-f]{2})([0-9a-f])/;
        var m = r.exec(url);
        if (!m || !m[1] || !m[2]) {
                return retval;
        }
        
        var g = parseInt(m[2]+m[1], b);
        if (!isNaN(g)) {
                if (base) {
                        retval = String.fromCharCode(97 + gg.m(g)) + base;
                } else {
                        retval = retval + (1+gg.m(g));
                }
        }
        
        return retval;
}