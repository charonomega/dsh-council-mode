import type { Worker } from '../shared/types.ts';
import { type RunTelemetry } from './telemetry.ts';
export interface NativeSupplementalContextInput {
    worker: Worker;
    runId: string;
    rawPath: string;
    /** WorkerStore root, not a CLI home or an arbitrary search directory. */
    storageDirectory: string;
    /** Supply only for the selected/current run. Presence requires exact current identity;
     * historical reads omit this and bind only to their own raw request. */
    currentIdentity?: {
        conversationId?: string;
        model?: string;
    };
}
/** Read only exact historical requests; current Worker preferences never identify an old run.
 * Own undefined properties mean an observed request explicitly invalidated an older value.
 * An empty object means no evidence and MUST NOT clear existing context pressure.
 */
export declare class NativeSupplementalContextReader {
    private readonly onChanged;
    private cache;
    private pending;
    private completed;
    private capacityMisses;
    private generation;
    constructor(onChanged?: () => void);
    clear(): void;
    private windowsObservation;
    read(input: NativeSupplementalContextInput): Partial<RunTelemetry>;
}
