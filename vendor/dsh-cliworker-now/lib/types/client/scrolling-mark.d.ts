/** Scrollbar fade-out delay after the last scroll event. */
export declare const SCROLLBAR_HIDE_MS = 900;
/**
 * Marks whichever area inside the layout is scrolling, so CSS can show its
 * scrollbar only then; timers and the listener end with the element.
 */
export declare function useScrollingMark(): (element: HTMLElement | null) => void;
