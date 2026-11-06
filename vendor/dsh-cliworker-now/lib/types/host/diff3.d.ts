/** Line-based three-way merge. Pure functions; callers own all file I/O. */
/** A changed base range and its replacement range on the other side. */
interface Hunk {
    baseStart: number;
    baseLength: number;
    sideStart: number;
    sideLength: number;
}
/** Upper bound for the Myers edit distance; larger rewrites are reported as unmergeable. */
export declare const MAX_EDIT_DISTANCE = 2000;
/** Splits text into lines that keep their terminators, so joining is byte exact. */
export declare function splitLines(text: string): string[];
/** Myers O(ND) diff over line arrays; undefined when the distance exceeds the bound. */
export declare function diffHunks(base: readonly string[], side: readonly string[], limit?: number): Hunk[] | undefined;
export type MergeOutcome = {
    clean: true;
    text: string;
} | {
    clean: false;
    reason: 'overlap' | 'too-large';
};
/**
 * Merges two descendants of `base`. Changes from both sides that touch or
 * overlap the same base region conflict unless they are identical.
 */
export declare function diff3Merge(base: string, ours: string, theirs: string): MergeOutcome;
export {};
