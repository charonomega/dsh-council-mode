import { type TimelineItem, type Worker } from '../shared/types.ts';
export declare const runOf: (item: TimelineItem) => string;
export declare const completedEmptyReply: (item: TimelineItem, worker?: Worker) => boolean;
export declare function processClosed(rows: TimelineItem[], worker?: Worker): boolean;
export declare function processAlwaysOpen(rows: TimelineItem[], worker?: Worker): boolean;
export declare function processContent(rows: TimelineItem[], worker?: Worker): TimelineItem[];
/** Native rc.2 TurnProcessNodeView geometry; only recorded boundaries supply elapsed time. */
export declare function WorkerProcessHeader({ rows, worker, open, toggle, }: {
    rows: TimelineItem[];
    worker?: Worker;
    open: boolean;
    toggle: () => void;
}): import("react/jsx-runtime").JSX.Element | null;
/** Validate only explicit identity links. Rendering order never follows a guessed name or timestamp. */
export declare function toolDepth(item: TimelineItem, rows: TimelineItem[]): {
    depth: number;
    unresolved: boolean;
};
/** One consecutive process span. User/assistant boundaries stay outside it in native order. */
export declare function WorkerProcessGroup({ items, rows, worker, hidden, first, }: {
    items: TimelineItem[];
    rows: TimelineItem[];
    worker?: Worker;
    hidden: boolean;
    first: boolean;
}): import("react/jsx-runtime").JSX.Element | null;
