import type { QueuedFollowup, TimelineItem, Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
import { type MessageKey } from './i18n.ts';
export declare const harnessLegacyHistoryNotice: MessageKey;
/** Reads the existing WorkerStorage Gateway only; never imports, copies or replays a turn. */
export declare function HarnessLegacyHistory({ api, parentSessionId, worker, items, truncated, queuedFollowups, }: {
    api: API;
    parentSessionId: string;
    worker: Worker;
    items: TimelineItem[];
    truncated: boolean;
    queuedFollowups?: readonly QueuedFollowup[];
}): import("react/jsx-runtime").JSX.Element;
