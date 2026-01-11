import {expect, test, describe} from 'bun:test';
import { downloadGalleryInfoJS, downloadGGJS, gg, galleryinfo, url_from_url_from_hash } from '../hitomi_util';
import PQueue from 'p-queue';
import ky from 'ky';

const TARGET_BOOK_ID = 3724954; // Example book ID for testing

describe('ggjs', () => {
    test('should download gg.js without errors', async () => {
        await downloadGGJS();
        expect(gg.b).not.toEqual('');
    });
});

describe('galleryinfo', () => {
    test('should download gallery info JS without errors', async () => {
        await downloadGGJS();
        await downloadGalleryInfoJS(TARGET_BOOK_ID);
        expect(galleryinfo.galleryurl).not.toEqual('');
    });
});

describe('book dl', () => {
    const api = ky.create({
        retry: {
            limit: 5,
            backoffLimit: 3000
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
            'Referer': 'https://hitomi.la/'
        },
        timeout: 10000
    });

    test('should download book images without errors', async () => {
        await downloadGGJS();
        await downloadGalleryInfoJS(TARGET_BOOK_ID);
        expect(galleryinfo.files.length).toBeGreaterThan(0);

        
        const queue = new PQueue({concurrency: 5});
        const tasks = galleryinfo.files.slice(0, 3).map((image) => { // Limit to first 3 images for test
            return queue.add(async () => {
                const imageUrl = url_from_url_from_hash(TARGET_BOOK_ID, image, 'webp', '', '');
                const res = await api.get(imageUrl);
                expect(res.ok).toBe(true);
                expect(await res.arrayBuffer()).toBeInstanceOf(ArrayBuffer); // Ensure we can read the data
            });
        });
        
        await Promise.all(tasks);
        
    });
});


