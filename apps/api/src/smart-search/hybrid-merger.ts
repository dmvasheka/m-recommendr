import type { RankedId } from './smart-search.types';

export interface MergedResult {
    id: number;
    score: number;
}

/**
 * Reciprocal Rank Fusion. k=60 is the standard.
 * For each ranked list, item gets score 1/(k+rank). Sum across lists.
 * Within a list, if an id appears multiple times, use the best (lowest) rank.
 */
export function rrfMerge(lists: RankedId[][], k = 60): MergedResult[] {
    const scores = new Map<number, number>();

    for (const list of lists) {
        const bestRank = new Map<number, number>();
        for (const { id, rank } of list) {
            const cur = bestRank.get(id);
            if (cur === undefined || rank < cur) bestRank.set(id, rank);
        }
        for (const [id, rank] of bestRank) {
            scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
        }
    }

    return Array.from(scores, ([id, score]) => ({ id, score }))
        .sort((a, b) => b.score - a.score);
}
