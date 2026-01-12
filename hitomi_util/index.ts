import PQueue from "p-queue";
import { collectGalleryIds, downloadBookImages } from "./hitomi_util";

// console.log("Hello via Bun!");
// const images =  await downloadBookImages(3724842, true, 0, 30)
// console.log(`Downloaded ${images.length} images.`);
// for(const img of images){
//     await img?.toFile(`./output/${Math.random().toString(36).substring(2, 15)}.webp`);
// }

const ret = await collectGalleryIds({
    type: 'all',
    name: '',
    populer: 'week',
    language: 'japanese',
    page: 1
})
console.log(ret.totalBooks)
const queue = new PQueue({concurrency: 100});
Array.from({length: ret.totalBooks}, (_, i) => i + 1).slice(1).map((page) => {
    return queue.add( async () => {
        const res = await collectGalleryIds({
            type: 'all',
            name: '',
            populer: 'week',
            language: 'japanese',
            page: page
        });
        console.log(`Page ${page}: ${res.galleryIds.length} galleries -> ${res.galleryIds.join(', ')}`);
    });
});