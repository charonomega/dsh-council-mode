import { z } from 'zod';
import type { SessionEvent } from '@deepseek-ai/dsh-session';
import { type Worker, type HarnessConversationBinding } from '../shared/types.ts';
import type { HarnessConversationRecord } from './harness-conversation-types.ts';
export interface ForkHistory {
    seed: readonly SessionEvent[];
    runId: string;
    earlier: boolean;
    turn: number;
}
export interface NativeForkCut {
    turnId?: string;
    messageId?: string;
}
declare const forkStateSchema: z.ZodObject<{
    nativeStateWorkerId: z.ZodOptional<z.ZodUUID>;
    historySourceWorkerId: z.ZodOptional<z.ZodUUID>;
    historySourceConversationId: z.ZodOptional<z.ZodString>;
    sourceConversationId: z.ZodOptional<z.ZodString>;
    sourceMessageId: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type WorkerForkState = z.infer<typeof forkStateSchema>;
export declare function readWorkerForkState(directory: string, id: string): WorkerForkState | undefined;
export declare function writeWorkerForkState(directory: string, id: string, state?: WorkerForkState): void;
/** Harness assistant IDs identify a completed Harness turn, never a native CLI ID. */
export declare function selectForkHistory(events: readonly SessionEvent[], record: HarnessConversationRecord, atMessageId: string): ForkHistory;
/** Only native completion receipts from the exact saved run may become a fork cutoff. */
export declare function nativeForkCut(cli: string, raw: string, sourceId: string): NativeForkCut;
export declare function forkWorkerName(parent: Worker, workers: readonly Worker[]): string;
export interface ForkChild {
    binding: HarnessConversationBinding;
    commit(): Promise<void>;
    rollback(): Promise<void>;
}
export interface WorkerForkDependencies {
    worker: Worker;
    workers(): readonly Worker[];
    assertIdle(): void;
    history(atMessageId: string): Promise<ForkHistory>;
    raw(runId: string): string;
    rawSourceId?(runId: string): string;
    native(cut: NativeForkCut): Promise<{
        conversationId: string;
        rollback(): Promise<void>;
    }>;
    stage(worker: Worker): void;
    child(worker: Worker, history: ForkHistory): Promise<ForkChild>;
    publish(worker: Worker, history: ForkHistory, state?: WorkerForkState): void;
    remove(worker: Worker): void;
    changed(): void;
    nativeStateWorkerId?: string;
}
/** One transaction shared by Remote and /fork. No task is ever launched here. */
export declare function forkWorkerConversation(deps: WorkerForkDependencies, atMessageId: string, signal: AbortSignal): Promise<{
    workerId: string;
    childSessionId: string;
}>;
export {};
