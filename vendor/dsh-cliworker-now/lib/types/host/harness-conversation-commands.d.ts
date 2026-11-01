import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Worker } from '../shared/types.ts';
import type { WorkerGoal } from '../shared/conversation-features.ts';
/** Command text only; persistence and parent authorization use the existing Host APIs. */
export declare function workerGoalCommand(worker: Worker, rawInput: string, actions: {
    set(objective: string, revision: number): Promise<WorkerGoal>;
    status(status: WorkerGoal['status'], revision: number): Promise<unknown>;
    clear(revision: number): Promise<void>;
}): Promise<string>;
declare module '@deepseek-ai/cordis' {
    interface Events {
        'commands/change'(): void;
    }
}
export declare const HARNESS_COMMAND_UNAVAILABLE = "\u6B64\u547D\u4EE4\u5C1A\u672A\u63A5\u901A CLI \u4F1A\u8BDD\u72B6\u6001\u6216\u8F85\u52A9\u6A21\u578B\u80FD\u529B\uFF1B\u539F\u751F\u53D1\u9001\u3001\u6392\u961F\u548C\u505C\u6B62\u4ECD\u53EF\u4F7F\u7528";
type FeatureCommand = (agent: Agent, rawInput: string, signal: AbortSignal) => Promise<string>;
/** Public agent-scoped command shadows, never a slash-text parser or core patch. */
export declare class HarnessConversationCommandGuard {
    private readonly ctx;
    private readonly owns;
    private readonly permission?;
    private readonly features;
    private readonly children;
    private readonly disposeHooks;
    private disposed;
    constructor(ctx: Context, owns: (agent: Agent) => boolean, permission?: ((agent: Agent, mode: string | undefined, signal: AbortSignal) => Promise<string>) | undefined, features?: {
        goal?: FeatureCommand;
        plan?: FeatureCommand;
        fork?: FeatureCommand;
    });
    protect(agent: Agent): void;
    private refresh;
    private release;
    dispose(): Promise<void>;
}
export {};
