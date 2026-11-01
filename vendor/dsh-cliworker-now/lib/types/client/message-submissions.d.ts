import { type QueuedFollowup, type TimelineItem, type Worker } from '../shared/types.ts';
import type { RunningMessageMode } from '../shared/running-message.ts';
import { type API, type Snapshot } from './workers.ts';
export interface MessageSubmission {
    id: string;
    worker: Worker;
    prompt: string;
    createdAt: string;
    route: 'followup' | 'running' | 'queue' | 'interrupt';
    mode: RunningMessageMode;
    /** Frozen at the click. RPC admission and later preferences never reclassify this view. */
    intent: 'direct' | 'running';
    presentation: 'bubble' | 'queue';
    sequence: number;
    receiptRevision?: number;
    admitted?: boolean;
    state: 'pending' | 'accepted' | 'failed' | 'cancelled';
    error?: string;
    uncertain?: boolean;
    /** Only an actual Host event or persisted outbox item confirms delivery. */
    confirmed?: boolean;
    acceptedRunId?: string;
    originalRunId: string;
    baseline: Set<string>;
    controller: AbortController;
    done: Promise<void>;
    /** The original queue RPC may finish later, but no longer owns this message. */
    redirected?: boolean;
    deliveryState?: TimelineItem['deliveryState'];
    admissionSettled?: boolean;
    priorityRevision?: number;
    superseded?: boolean;
    stopped?: boolean;
    /** The Host confirmed this steer's native run exited; its unknown history remains local. */
    runEnded?: boolean;
    releaseAdmission?: () => void;
}
/** Local feedback only. The Host remains the owner of accepted messages and execution. */
export declare function useMessageSubmissions(api: API, sessionId: string, snapshot: Snapshot, restoreDraft: (workerId: string, text: string) => void): {
    busyFor: (workerId: string) => boolean;
    canSteer: (workerId: string) => boolean;
    submit: (worker: Worker, prompt: string, route: MessageSubmission["route"], mode: RunningMessageMode, retry?: MessageSubmission) => MessageSubmission | undefined;
    steerMessage: (worker: Worker, prompt: string, retry?: MessageSubmission) => MessageSubmission | undefined;
    interruptQueued: (worker: Worker, item: QueuedFollowup) => MessageSubmission;
    cancelPending: (workerId: string) => Promise<void>;
    confirmStopped: (workerId: string, stoppedRunId: string, scope: ReadonlySet<MessageSubmission>) => void;
    waitForStop: (workerId: string, stopping: Promise<unknown>) => void;
    stopUnconfirmed: boolean;
    stopScope: (workerId: string) => Set<MessageSubmission>;
    discard: (message: MessageSubmission) => void;
    recover: (message: MessageSubmission) => void;
    localMessages: MessageSubmission[];
    localQueue: MessageSubmission[];
    optimisticTimeline: TimelineItem[];
    optimisticQueue: QueuedFollowup[];
    hostTimeline: TimelineItem[];
    hostQueue: QueuedFollowup[];
    interrupting: boolean;
    uncertain: boolean;
    pending: boolean;
};
