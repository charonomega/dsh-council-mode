import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { WorkerSnapshot } from '../shared/types.ts';
import type { TaskMode } from '../shared/types.ts';
export type Snapshot = WorkerSnapshot & {
    configuring?: boolean;
};
export type API = Pick<ClientRemote, '$stream'> & {
    cliworker: Omit<ClientRemote['cliworker'], 'ensureHarnessConversation' | 'repairHarnessConversation' | 'permissionForWorker' | 'configureWorkerPermission' | 'setWorkerGoal' | 'setWorkerGoalStatus' | 'clearWorkerGoal' | 'forkWorker'> & {
        /** Optional until an older Host has upgraded its native-conversation bridge. */
        ensureHarnessConversation?: (parentId: string, workerId: string) => Promise<RemoteResult<string>>;
        /** Explicitly repair an unreadable owned display binding; never submits a CLI prompt. */
        repairHarnessConversation?: (parentId: string, workerId: string, expectedSessionId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        permissionForWorker?: (parentId: string, workerId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
        configureWorkerPermission?: (parentId: string, workerId: string, mode: TaskMode, signal: AbortSignal) => Promise<RemoteResult<string>>;
        setWorkerGoal?: (parentId: string, workerId: string, objective: string, expectedRevision: number, signal: AbortSignal) => Promise<RemoteResult<string>>;
        setWorkerGoalStatus?: (parentId: string, workerId: string, status: 'active' | 'paused', expectedRevision: number, signal: AbortSignal) => Promise<RemoteResult<string>>;
        clearWorkerGoal?: (parentId: string, workerId: string, expectedRevision: number, signal: AbortSignal) => Promise<RemoteResult<void>>;
        forkWorker?: (parentId: string, workerId: string, atMessageId: string, signal: AbortSignal) => Promise<RemoteResult<string>>;
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
