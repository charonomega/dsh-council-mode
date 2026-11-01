import type { Worker, WorkerEvent } from '../shared/types.ts';
/** Bounded, identity-bound read cache. No writes, prompt requests, or guessed adjacent-message merges. */
export declare class NativeTimelineReprojector {
    private cache;
    project(worker: Pick<Worker, 'id' | 'transport' | 'preference'>, events: readonly WorkerEvent[], rawPath: (runId: string) => string): readonly WorkerEvent[];
}
