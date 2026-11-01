import type { QueuedFollowup, TimelineItem, Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
export declare const harnessLegacyHistoryNotice = "\u539F\u751F\u5BF9\u8BDD\u4ECE\u672C\u6B21\u6302\u63A5\u5F00\u59CB\uFF1B\u66F4\u65E9\u8BB0\u5F55\u89C1\u65E7\u5386\u53F2\u3002";
/** Reads the existing WorkerStorage Gateway only; never imports, copies or replays a turn. */
export declare function HarnessLegacyHistory({ api, parentSessionId, worker, items, truncated, queuedFollowups, }: {
    api: API;
    parentSessionId: string;
    worker: Worker;
    items: TimelineItem[];
    truncated: boolean;
    queuedFollowups?: readonly QueuedFollowup[];
}): import("react/jsx-runtime").JSX.Element;
