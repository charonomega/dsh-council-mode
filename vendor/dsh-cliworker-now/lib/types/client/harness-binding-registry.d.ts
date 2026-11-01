import { type CliId, type HarnessConversationBinding, type Worker } from '../shared/types.ts';
export type HarnessNativeBinding = HarnessConversationBinding & {
    /** Exact owning Worker; never inferred from a CLI conversation id. */
    workerId?: string;
    /** Display metadata from Worker snapshots, never a replacement model directory. */
    cliSelection?: {
        cli?: CliId;
        model: string;
        effort: string;
        observedModel?: string;
    };
};
/** Host-issued child identities shared by the native main view and Worker management. */
export declare class HarnessBindingRegistry {
    private readonly bindings;
    private readonly listeners;
    private snapshot;
    get: (sessionId: string) => HarnessNativeBinding | undefined;
    getSnapshot: () => readonly HarnessNativeBinding[];
    subscribe: (listener: () => void) => () => void;
    publish(binding: HarnessConversationBinding, worker?: Pick<Worker, 'id' | 'preference' | 'observedModel'>): void;
    clear(): void;
}
export declare function useHarnessSessionBinding(registry: HarnessBindingRegistry, sessionId: string): HarnessNativeBinding | undefined;
