import {expect, test, describe} from 'bun:test';

const add = (a: number, b: number) => a + b;

describe('Addition function', () => {
    test("2 + 3 should equal 5", () => {
        expect(add(2, 3)).toBe(5);
    });
});
