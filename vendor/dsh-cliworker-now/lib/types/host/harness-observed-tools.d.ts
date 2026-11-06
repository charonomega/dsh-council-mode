import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ContentBlock } from '@deepseek-ai/dsh-llm';
import { type TimelineItem } from '../shared/types.ts';
import type { HarnessConversationDependencies, HarnessConversationRecord } from './harness-conversation-types.ts';
/** Call arguments of an observed CLI tool; a command-only entry (Codex commandExecution) shows its command. */
export declare function observedToolInput(toolCall: NonNullable<TimelineItem['toolCall']>): unknown;
/** AgentLoop receives an existing CLI receipt; this registry cannot execute a tool. */
export declare class HarnessObservedTools {
    private readonly agent;
    private readonly record;
    private readonly runId;
    private readonly deps;
    private readonly source;
    private readonly receipts;
    private readonly names;
    private readonly disposers;
    private disposed;
    private readonly finalized;
    private readonly accepted;
    constructor(agent: Agent, record: HarnessConversationRecord, runId: string, deps: HarnessConversationDependencies, source: {
        rows(): TimelineItem[];
        changed(signal: AbortSignal): Promise<void>;
        settled(): boolean;
        completed(): boolean;
        hasFollowing(): boolean;
        close(): void;
        inputsSettled(): Promise<void>;
        stop(): Promise<void>;
    });
    private receipt;
    private readReceipt;
    declare(row: TimelineItem): Promise<Extract<ContentBlock, {
        type: 'tool-call';
    }>>;
    close(): void;
}
