import type { Agent } from '@deepseek-ai/dsh-agent';
import { type StreamChunk } from '@deepseek-ai/dsh-llm';
import { type WorkerEvent } from '../shared/types.ts';
import type { HarnessConversationDependencies, HarnessConversationRecord, HarnessConversationRun } from './harness-conversation-types.ts';
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'cliworker-continuation': {
            kind: 'cliworker-continuation';
            form: 'notice';
            summary: string;
        };
        'cliworker-steering': {
            kind: 'cliworker-steering';
            form: 'notice';
            summary: string;
        };
    }
}
export declare class HarnessConversationStream {
    readonly record: HarnessConversationRecord;
    readonly run: HarnessConversationRun;
    private readonly deps;
    private readonly signal;
    private readonly source;
    private readonly nativeInputs?;
    private readonly history;
    private seq;
    private row;
    private outcome?;
    private issue?;
    private readonly waiters;
    private readonly unsubscribe;
    private closed;
    private active;
    private stopping?;
    private readonly abort;
    private readonly settledResponses;
    private observedTools?;
    constructor(record: HarnessConversationRecord, run: HarnessConversationRun, deps: HarnessConversationDependencies, signal: AbortSignal, source: {
        provider: string;
        model: string;
    }, nativeInputs?: {
        /** Original native messages already own the user echo for these Worker receipts. */
        projectUser(agent: Agent, event: WorkerEvent): boolean | Promise<boolean>;
        /** Receipt persistence and original-message restoration are part of turn cleanup. */
        settled(): Promise<void>;
    } | undefined);
    get finished(): boolean;
    /** The turn signal remains owned between projection steps, not only while yielding. */
    stop(): Promise<void>;
    private rows;
    private notify;
    private changed;
    private continuation;
    /** These verified producers only append published public reasoning text.
     * Other protocols may withdraw snapshots and retain their completion gate.
     */
    private appendOnlyReasoning;
    private finish;
    /** One proven provider response, preserving its block identities and one usage sample. */
    private responseSegment;
    /** Project one native boundary; adjacent ungrouped narrative rows share a step. */
    segment(agent: Agent, turn: number, step: number, signal: AbortSignal): AsyncGenerator<StreamChunk>;
    close(): void;
}
