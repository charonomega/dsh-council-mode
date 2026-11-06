import { type WorkerEvent } from '../shared/types.ts';
export declare const CARRYOVER_BUDGET = 24000;
export interface CarryoverContext {
    /** Prompt prefix; empty when there is no earlier record. */
    text: string;
    included: number;
    omitted: number;
}
/**
 * Deterministic excerpt of a task's earlier public record for a new native
 * session. No model is called. The first user request and the most recent
 * whole turns are kept; anything between them is counted as omitted.
 * Tool output bodies are never included.
 */
export declare function carryoverContext(events: readonly WorkerEvent[], currentRunId: string, budget?: number): CarryoverContext;
