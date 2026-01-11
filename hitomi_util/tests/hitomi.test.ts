import {expect, test, describe} from 'bun:test';
import { downloadGalleryInfoJS, downloadGGJS, gg, galleryinfo } from '../hitomi_util';

describe('ggjs', () => {
    test('should download gg.js without errors', async () => {
        await downloadGGJS();
        expect(gg.b).not.toEqual('');
    });
});

describe('galleryinfo', () => {
    test('should download gallery info JS without errors', async () => {
        await downloadGGJS();
        await downloadGalleryInfoJS(3724954);
        expect(galleryinfo.galleryurl).not.toEqual('');
    });
});


