import type { NativeAccess } from './native-approval-policy.ts';
import { type Effort, type ModelChoice, type TaskMode } from '../shared/types.ts';
import type { EventInput, ProtocolResult } from './protocol.ts';
import type { AccountIdentity } from './account-identity.ts';
import { probeAccountModels } from './account-models.mjs';
export declare const ZCODE_DENIED_TOOLS: readonly ["mcp__node_repl__js"];
export interface ZCodeInput {
    executable: string;
    project: string;
    preference: {
        model: string;
        effort: Effort;
    };
    mode: TaskMode;
    access?: NativeAccess;
    prompt: string;
    conversationId?: string;
    nativeTransport?: boolean;
    stateDirectory: string;
    authDirectory?: string;
    builtinConfig?: string;
    nativeHome?: string;
    personalConfig?: string;
}
/** Login and every worker share auth; sessions, logs and model choices stay isolated. */
export declare function zcodeAuthDirectory(configured?: string, stateDirectory?: string): string;
/** A complete, version-controlled CLI can be deployed here without relying on /tmp. */
export declare function managedZCodeEntry(home?: string): string;
export declare function zcodeEnvironment(executable: string, state: string, auth?: string, builtin?: string): {
    ZCODE_DATA_BASE_DIR: string;
    ZCODE_STORAGE_DIR: string;
    ZCODE_SESSION_DB_PATH: string;
    ZCODE_LOG_DIR: string;
    ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: string;
    ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: string;
    TMPDIR: string;
    ZCODE_CREDENTIAL_SECRET?: string | undefined;
};
/** Handed to the bridge only; it removes the variable before starting the CLI. */
export declare const ZCODE_MEMORY_ENVIRONMENT = "CLIWORKER_ZCODE_NATIVE_MEMORY";
export declare function prepareZCode(input: ZCodeInput): Promise<{
    argv: string[];
    env: {
        ZCODE_DATA_BASE_DIR: string;
        ZCODE_STORAGE_DIR: string;
        ZCODE_SESSION_DB_PATH: string;
        ZCODE_LOG_DIR: string;
        ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: string;
        ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: string;
        TMPDIR: string;
        ZCODE_CREDENTIAL_SECRET?: string | undefined;
    };
}>;
export interface ZCodeDiscoveryOptions {
    nativeHome?: string;
    personalConfig?: string;
    signal?: AbortSignal;
    /** Isolated read-only account metadata transport for tests. */
    probeOptions?: Parameters<typeof probeAccountModels>[1];
    credentialSecret?: string;
}
/** Private Host material, using the exact discovery overlay and current-account key binding. */
export declare function readZCodeBindingMaterial(executable: string, authDirectory: string, builtinConfig?: string, options?: ZCodeDiscoveryOptions): Promise<{
    credentials: {
        provider: string;
        identity?: string;
        key: string;
        baseUrl: string;
        apiType: string;
    }[];
    sourceIds: string[];
}>;
/** Account evidence is an explicit native API credential, never a catalog entry. */
export declare function readZCodePersonalIdentity(authDirectory?: string, options?: ZCodeDiscoveryOptions): AccountIdentity;
/** Public projection contains only original model/provider identifiers and proven reasoning choices. */
export declare function parseZCodeBuiltin(value: unknown, personal?: unknown): ModelChoice[];
export declare function discoverZCode(executable: string, _capture: (argv: string[], env?: Record<string, string>) => Promise<string>, _stateDirectory: string, authDirectory?: string, builtinConfig?: string, options?: ZCodeDiscoveryOptions): Promise<ModelChoice[]>;
export declare class ZCodeProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    private expectedModel?;
    private decoder;
    private pending;
    private steps;
    private open;
    private toolNames;
    private failed;
    private completed;
    private ended;
    private responses;
    private thoughts;
    private activeThought?;
    conversationId?: string;
    result?: ProtocolResult;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number, expectedModel?: string | undefined);
    feed(chunk: Buffer | string): void;
    end(): void;
    private step;
    private finishThought;
    private line;
}
