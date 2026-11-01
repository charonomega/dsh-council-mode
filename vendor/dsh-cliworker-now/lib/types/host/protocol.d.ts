import type { WorkerEvent } from '../shared/types.ts';
export interface ProtocolResult {
    conversationId: string;
    status: string;
    response: string;
    error?: string;
    /** AGY text observed in this process, independent of its conversation-wide result. */
    currentTurnResponse?: string;
    /** Evidence of DONE steps only; this does not establish task success. */
    completedStepResponse?: string;
}
export type EventInput = Omit<WorkerEvent, 'seq' | 'runId' | 'time'>;
/** Antigravity 1.2.16 NDJSON framing, including split UTF-8 characters. */
export declare class AgyProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    private decoder;
    private pending;
    result?: ProtocolResult;
    conversationId?: string;
    private responses;
    private steps;
    private unclassifiedOrFailed;
    get currentTurnResponse(): string;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number);
    feed(chunk: Buffer | string): void;
    end(): void;
    private id;
    private line;
}
