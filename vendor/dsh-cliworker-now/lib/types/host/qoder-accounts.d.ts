import { type QoderCliId } from './qoder-variant.ts';
import { type AccountIdentity } from './account-identity.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
import { type ModelChoice } from '../shared/types.ts';
export declare class QoderAccountError extends Error {
    readonly code = "CLI_OWN_ACCOUNT_REQUIRED";
    constructor(message?: string);
}
/** Only one catalog operation may share its native account/model projection.
 * End-session, range exit and private cleanup precede every consumer. A fresh
 * source proof after leaving the scope rejects concurrent logout/routing changes. */
export declare function withQoderCatalogSnapshot<T>(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal, operation: () => Promise<T>, cli?: QoderCliId): Promise<T>;
export declare function qoderProjectDirectoryName(cli?: QoderCliId): string;
export declare function qoderConfigDirectory(env?: NodeJS.ProcessEnv, cli?: QoderCliId): string;
/** Pin the selected native account root and clear the other brand's controls. */
export declare function qoderEnvironment(cli?: QoderCliId): Record<string, string>;
export declare function queryQoderAccountInfo(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal, cli?: QoderCliId): Promise<unknown>;
interface QoderAccountOptions {
    cli?: QoderCliId;
    directory?: string;
    project?: string;
    backend?: ProcessBackend;
    config?: RuntimeConfig;
    /** Synthetic metadata injection for local tests; production queries the official control protocol. */
    query?: () => Promise<unknown> | unknown;
}
export declare function readQoderAccount(executable: string, signal: AbortSignal, options?: QoderAccountOptions): Promise<AccountIdentity>;
/** Host-only stable principal; native access/refresh rotation never changes this binding. */
export declare function readQoderAccountBindingMaterial(executable: string, signal: AbortSignal, options?: QoderAccountOptions): Promise<{
    sourceIds: string[];
    entries: ({
        route: {
            source: string;
            fingerprint: string;
        }[];
        provider: QoderCliId;
        principal: {
            kind: string;
            key: string;
        };
    } | {
        route: {
            source: string;
            fingerprint: string;
        }[];
        provider: QoderCliId;
        principal: {
            kind: string;
            uid: string;
            organization: string | undefined;
        };
    })[];
}>;
export declare const QODER_METADATA_ARGUMENTS: string[];
/** Official SDK initialize.models. BHs always exposes isEnabled; disabled SDK
 * entries must not become selectable because ACP getAvailableModels filters them. */
export declare function parseQoderModelState(state: unknown): ModelChoice[];
/** Metadata only: never authenticate, prompt, select a model or create a persisted session. */
export declare function discoverQoderModels(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal, cli?: QoderCliId): Promise<ModelChoice[]>;
export {};
