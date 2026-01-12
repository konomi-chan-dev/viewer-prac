import PQueue from "p-queue";
import { collectGalleryIds, downloadBookImages } from "./hitomi_util";
import type { GallerySearchOption } from "./types";

// console.log("Hello via Bun!");
// const images =  await downloadBookImages(3724842, true, 0, 30)
// console.log(`Downloaded ${images.length} images.`);
// for(const img of images){
//     await img?.toFile(`./output/${Math.random().toString(36).substring(2, 15)}.webp`);
// }

const targetBookIds = new Set<number>();
const searchOption: GallerySearchOption = {
    type: 'type',
    name: 'doujinshi',
    populer: 'week',
    language: 'japanese',
    page: 1
}
const ret = await collectGalleryIds(searchOption);
ret.galleryIds.forEach(id => targetBookIds.add(id));
const queue = new PQueue({concurrency: 100});
Array.from({length: Math.min(1000, ret.totalPages)}, (_, i) => i + 1).slice(1).map((page) => {
    return queue.add( async () => {
        const res = await collectGalleryIds({
            ...searchOption,
            page: page
        });
        res.galleryIds.forEach(id => targetBookIds.add(id));
        console.log(`Page ${page}: ${res.galleryIds.length} galleries -> ${res.galleryIds.join(', ')}`);
    });
});
await queue.onIdle();
console.log(`Total collected gallery IDs: ${targetBookIds.size}`);