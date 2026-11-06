import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { CliId, WorkerSnapshot, DshSubagent } from '../shared/types.ts';
import type { TaskMode, WorkerLevel } from '../shared/types.ts';
export type Snapshot = WorkerSnapshot & {
    configuring?: boolean;
};
export type API = Pick<ClientRemote, '$stream'> & {
    cliworker: Omit<ClientRemote['cliworker'], 'ensureHarnessConversation' | 'repairHarnessConversation' | 'permissionForWorker' | 'configureWorkerPermission' | 'setWorkerGoal' | 'setWorkerGoalStatus' | 'clearWorkerGoal' | 'forkWorker' | 'accountRespond' | 'accountStartWith' | 'recoverCliCleanup' | 'listDshSubagents' | 'watchDshSubagents' | 'promptDshSubagent' | 'stopDshSubagent' | 'hideDshSubagent'> & {
        listDshSubagents?: (parentId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        watchDshSubagents?: (parentId: string, signal: AbortSignal) => ReturnType<ClientRemote['cliworker']['watch']>;
        promptDshSubagent?: (parentId: string, childId: string, prompt: string, requestId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        stopDshSubagent?: (parentId: string, childId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        hideDshSubagent?: (parentId: string, childId: string, signal: AbortSignal) => Promise<RemoteResult<void>>;
        /** Optional until an older Host has upgraded its native-conversation bridge. */
        ensureHarnessConversation?: (parentId: string, workerId: string) => Promise<RemoteResult<string>>;
        /** Explicitly repair an unreadable owned display binding; never submits a CLI prompt. */
        repairHarnessConversation?: (parentId: string, workerId: string, expectedSessionId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        permissionForWorker?: (parentId: string, workerId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        configureWorkerPermission?: (parentId: string, workerId: string, setting: TaskMode | WorkerLevel, signal: AbortSignal) => Promise<RemoteResult<string>>;
        setWorkerGoal?: (parentId: string, workerId: string, objective: string, expectedRevision: number, signal: AbortSignal) => Promise<RemoteResult<string>>;
        setWorkerGoalStatus?: (parentId: string, workerId: string, status: 'active' | 'paused', expectedRevision: number, signal: AbortSignal) => Promise<RemoteResult<string>>;
        clearWorkerGoal?: (parentId: string, workerId: string, expectedRevision: number, signal: AbortSignal) => Promise<RemoteResult<void>>;
        forkWorker?: (parentId: string, workerId: string, atMessageId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        /** The user's answer to a plugin-drawn login window step (JSON); absent on older Hosts. */
        accountRespond?: (parentId: string, accountId: string, response: string) => Promise<RemoteResult<boolean>>;
        /** A provider picked in the account window, or one login to sign out; absent on older Hosts. */
        accountStartWith?: (parentId: string, cli: CliId, action: string, options: string, signal?: AbortSignal) => Promise<RemoteResult<string>>;
        /** Release one CLI paused after an unconfirmed cleanup, once the user confirmed; absent on older Hosts. */
        recoverCliCleanup?: (parentId: string, cli: CliId, signal: AbortSignal) => Promise<RemoteResult<string>>;
    };
};
export declare const value: <T>(result: RemoteResult<T>) => T;
export declare function useWorkers(api: API, session: string, selected?: string): {
    reconnect: () => void;
    key: string;
    session: string;
    snapshot: Snapshot;
    error: string;
    connecting: boolean;
} | {
    reconnect: () => void;
    snapshot: Snapshot;
    error: string;
    connecting: boolean;
};
/** Separate failure domain: a missing native service cannot break the Worker stream. */
export declare function useDshSubagents(api: API, session: string, enabled: boolean): {
    rows: DshSubagent[];
    error: string | undefined;
    refresh: () => void;
};
export declare function filterDshSubagents(rows: DshSubagent[], query: string, filter: string): DshSubagent[];
