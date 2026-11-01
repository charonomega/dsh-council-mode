import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type HarnessBindingRegistry } from './harness-binding-registry.ts';
import { type API, type Snapshot } from './workers.ts';
export interface WorkerForkTurn {
    turn: number;
    seq: number;
    messageId: string;
}
export type WorkerForkCut = {
    atMessageId: string;
    reason?: string;
};
/** Only completed assistant turn boundaries can be addressed. Latest uses the wire sentinel. */
export declare function workerForkCut(turns: readonly WorkerForkTurn[], target?: {
    turn?: number;
    seq?: number;
}): WorkerForkCut;
type ForkServices = Pick<Context, 'sessions' | 'uiConversation' | 'uiWorkspace'>;
export declare class HarnessWorkerFork {
    readonly services: ForkServices;
    readonly bindings: HarnessBindingRegistry;
    readonly api: API;
    private readonly states;
    private readonly pending;
    private readonly listeners;
    private revision;
    private disposed;
    private error;
    constructor(services: ForkServices, bindings: HarnessBindingRegistry, api: API);
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => number;
    getError: () => string;
    private changed;
    update(sessionId: string, snapshot: Snapshot): void;
    turns(sessionId: string): WorkerForkTurn[];
    cut(sessionId: string, target?: {
        turn?: number;
        seq?: number;
    }): WorkerForkCut;
    reason(sessionId: string, cut?: WorkerForkCut): string | undefined;
    /** Unsupported/busy paths settle without a request or an error notification. */
    fork(sessionId: string, cut?: WorkerForkCut): Promise<SessionId | undefined>;
    dismissError: () => void;
    dispose(): void;
}
/** Patch the shared public dispatch boundary, including existing shortcut closures.
 * defineProperty intentionally reaches the service instance through Cordis' tracker;
 * assignment would write only to the caller's temporary shadow object. */
export declare function installHarnessForkRouting(services: ForkServices, forks: HarnessWorkerFork): () => void;
export declare function installHarnessForkMenu(ctx: Pick<Context, 'slots'>, bindings: HarnessBindingRegistry, forks: HarnessWorkerFork): () => void;
export declare function HarnessForkNotice({ forks }: {
    forks: HarnessWorkerFork;
}): import("react/jsx-runtime").JSX.Element | null;
export {};
