import { rrfMerge } from '../hybrid-merger';
import type { RankedId } from '../smart-search.types';

describe('rrfMerge', () => {
    const k = 60;

    it('returns empty when all input lists are empty', () => {
        expect(rrfMerge([], k)).toEqual([]);
    });

    it('returns single list ordered by RRF score (== same order) when only one list', () => {
        const a: RankedId[] = [
            { id: 1, rank: 1 },
            { id: 2, rank: 2 },
            { id: 3, rank: 3 },
        ];
        const merged = rrfMerge([a], k);
        expect(merged.map((r) => r.id)).toEqual([1, 2, 3]);
    });

    it('boosts items appearing in both lists above items appearing in only one', () => {
        const vec: RankedId[] = [
            { id: 1, rank: 1 },
            { id: 2, rank: 2 },
        ];
        const kw: RankedId[] = [
            { id: 3, rank: 1 },
            { id: 1, rank: 2 },
        ];
        const merged = rrfMerge([vec, kw], k);
        expect(merged[0].id).toBe(1);
    });

    it('handles duplicate IDs within a single list by using best (lowest) rank', () => {
        const a: RankedId[] = [
            { id: 1, rank: 5 },
            { id: 1, rank: 1 },
        ];
        const merged = rrfMerge([a], k);
        expect(merged[0].id).toBe(1);
        expect(merged[0].score).toBeCloseTo(1 / (k + 1), 5);
    });

    it('result is sorted by score descending', () => {
        const a: RankedId[] = [
            { id: 1, rank: 1 },
            { id: 2, rank: 2 },
            { id: 3, rank: 3 },
        ];
        const merged = rrfMerge([a], k);
        for (let i = 1; i < merged.length; i++) {
            expect(merged[i - 1].score).toBeGreaterThanOrEqual(merged[i].score);
        }
    });
});
