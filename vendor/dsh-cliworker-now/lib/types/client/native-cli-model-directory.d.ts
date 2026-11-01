import type { ModelProviderGroup, ModelCatalogFailure, ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import { type Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
/** Exact rc.2 ModelSelect business data contract, populated only from CLI metadata. */
export interface NativeCliModelDirectoryState {
    current: ModelSelection | null;
    retainedEffort?: string;
    routable: boolean | null;
    groups: readonly ModelProviderGroup[];
    failures: readonly ModelCatalogFailure[];
    status: 'idle' | 'loading' | 'ready' | 'selecting' | 'error';
    pending: ModelSelection | null;
    error: string | null;
}
export declare class NativeCliModelDirectory {
    private readonly api;
    private readonly parentId;
    readonly store: import("@deepseek-ai/dsh-client-store").SnapshotStore<NativeCliModelDirectoryState>;
    private request?;
    private generation;
    private selectionObservation;
    private closed;
    private models;
    private worker;
    private locked;
    constructor(api: API, parentId: string, worker: Worker);
    sync(worker: Worker, locked: boolean): void;
    private selection;
    load: () => void;
    select: (selection: ModelSelection) => Promise<RemoteResult<void>>;
    dispose(): void;
}
