import {expect, test, describe} from 'bun:test';
import { downloadGGJS, gg } from '../hitomi_util';

describe('downloadGGJS function', () => {
    test('should download gg.js without errors', async () => {
        await downloadGGJS();
        expect(gg.b).not.toEqual('');
    });
});


