import PQueue from "p-queue";
import type { ImageInfo, GalleryInfo, GallerySearchOption } from "./types";
import ky from 'ky';
import sharp from "sharp";

function getFetchOptions() {
    return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
        'Referer': 'https://hitomi.la/'
    }
}

const api = ky.create({
    retry: {
        limit: 20,
        backoffLimit: 1000
    },
    headers: getFetchOptions(),
    timeout: 20000
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

export async function downloadGGJS(): Promise<void> {
    const res = await api.get(GGJS_URL);
    if (!res.ok) {
        throw new Error(`Failed to fetch gg.js: ${res.status} ${res.statusText}`);
    }
    
    eval(await res.text());
}

export async function downloadGalleryInfoJS(bookId: number): Promise<GalleryInfo> {
    const res = await api.get(`${RESOURCE_ROOT}/galleries/${bookId}.js`);
    if (!res.ok) {
        throw new Error(`Failed to fetch gallery info JS for book ID ${bookId}: ${res.status} ${res.statusText}`);
    }
    let galleryInfoJS = await res.text();
    galleryInfoJS = galleryInfoJS.replace('var galleryinfo = ', 'return ');
    const galleryinfo: GalleryInfo = new Function(galleryInfoJS)();
    return galleryinfo;
}

export async function downloadBookImages(bookId: number, thumbnail: boolean, n: number = 0, concurrency: number = 10): Promise<(sharp.Sharp | undefined)[]> {
    try{
        await downloadGGJS();
    }catch(error){
        console.error(error);
        return [];
    }

    try{
        const galleryinfo = await downloadGalleryInfoJS(bookId);
        const queue = new PQueue({concurrency: concurrency});
        const tasks = galleryinfo.files.slice(0, n > 0 ? n : galleryinfo.files.length).map((image, index) => {
            return queue.add(async () => {
                let imageUrl = url_from_url_from_hash(bookId, image, thumbnail ? index == 0 ? 'webpbigtn' : 'webpsmalltn' : 'webp', thumbnail ? 'webp' : '', thumbnail ? 'tn' : '');
                if(thumbnail){
                    imageUrl = url_from_url(imageUrl, 'tn', '');
                }
                try{
                    const res = await api.get(imageUrl);
                    if(res.ok) {
                        return sharp(await res.arrayBuffer())
                    }
                }catch(error){
                    console.error(`Error downloading image ${imageUrl}:`, error);
                }
            });
        });

        return await Promise.all(tasks);

    }catch(error){
        console.error(error);
    }
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
        const totalBooks = Math.ceil(parseInt(res.headers.get('content-range')?.replace(/^[Bb]ytes \d+-\d+\//, '') || '0') / 4 / 25);
        return {galleryIds, totalBooks};

    } catch (error) {
        console.error('Error collecting gallery IDs:', error);
    }
    return {galleryIds: [], totalBooks: 0};
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