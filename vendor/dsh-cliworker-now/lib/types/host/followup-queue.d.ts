import type { QueuedFollowup } from '../shared/types.ts';
import { type WorkerStorage } from './storage.ts';
/** Host-private outbox. Restart restores text but never restores execution authority. */
export declare class FollowupQueue {
    private storage;
    private queues;
    constructor(storage: WorkerStorage);
    private path;
    private save;
    list(workerId: string): QueuedFollowup[];
    generation(workerId: string): number;
    generationOf(workerId: string, id: string): number | undefined;
    advanceGeneration(workerId: string): number;
    /**
     * Stop must not depend on disk. The in-memory generation advances first so
     * earlier items lose their sending eligibility; a failed write is returned
     * for the caller to report after cancellation has started.
     */
    revokeGeneration(workerId: string): {
        previous: number;
        persistenceError?: unknown;
    };
    receipt(workerId: string, prompt: string, requestId: string): {
        delivery: 'queue' | 'steer';
        item?: QueuedFollowup;
        acknowledged?: boolean;
    } | undefined;
    /** Reserve the identity before native delivery; an uncertain receipt must never be resent as a queue item. */
    recordSteering(workerId: string, prompt: string, requestId: string, acknowledged: boolean): void;
    forgetRejectedSteering(workerId: string, requestId: string): void;
    add(workerId: string, prompt: string, requestId: string): QueuedFollowup;
    /** Moving a message to durable conversation history consumes its outbox identity. */
    consume(workerId: string, prompt: string, requestId: string): void;
    restoreStates(workerId: string, previous: QueuedFollowup[]): void;
    remove(workerId: string, id: string): void;
    update(workerId: string, state: 'pending' | 'paused', pauseReason?: string, throughGeneration?: number): void;
    releaseClaim(workerId: string, id: string): void;
    /** Explicit interruption may activate one message without resuming an already paused queue. */
    promote(workerId: string, id: string, previous: QueuedFollowup[]): QueuedFollowup;
    claim(workerId: string): QueuedFollowup | undefined;
}
