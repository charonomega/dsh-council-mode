import { type ModelChoice, type TaskMode } from '../shared/types.ts';
import type { EventInput, ProtocolResult } from './protocol.ts';
import { type OpenCodeNativeOptions } from './opencode-native.ts';
import { probeAccountModels } from './account-models.mjs';
export interface OpenCodeInput {
    executable: string;
    project: string;
    preference: {
        model: string;
        effort: string;
    };
    mode: TaskMode;
    prompt: string;
    conversationId?: string;
    stateDirectory: string;
    /** Stable private XDG data root shared with account login, not worker databases. */
    authDirectory?: string;
    /** Deprecated compatibility option; ignored. */
    managedCredentials?: boolean;
    nativeHome?: string;
    modelsPath?: string;
    signal?: AbortSignal;
}
type Capture = (argv: string[], env?: Record<string, string>) => Promise<string>;
export interface OpenCodeCredentialConfig {
    zaiCredentialRef?: string;
    resolveCredential?: (ref: string) => Promise<string | undefined>;
}
/** Compatibility only: Host credentials are never resolved for OpenCode. */
export declare function openCodeCredentialEnvironment(_config: OpenCodeCredentialConfig): Promise<Record<string, string>>;
export declare function openCodeAuthDirectory(stateDirectory?: string): string;
/** Only the auth data root is shared; each process keeps its own DB/config/cache. */
export declare function openCodeEnvironment(stateDirectory: string, config: Record<string, unknown>, authDirectory?: string, _managedCredentials?: boolean, modelsPath?: string): Promise<{
    OPENCODE_MODELS_PATH?: string | undefined;
    XDG_CONFIG_HOME: string;
    XDG_DATA_HOME: string;
    XDG_CACHE_HOME: string;
    XDG_STATE_HOME: string;
    TMPDIR: string;
    OPENCODE_TEST_HOME: string;
    OPENCODE_DB: string;
    OPENCODE_CONFIG: string;
    OPENCODE_CONFIG_DIR: string;
    OPENCODE_CONFIG_CONTENT: string;
    OPENCODE_PERMISSION: string;
    OPENCODE_AUTO_SHARE: string;
    OPENCODE_DISABLE_AUTOUPDATE: string;
    OPENCODE_DISABLE_PRUNE: string;
    OPENCODE_DISABLE_SHARE: string;
    OPENCODE_DISABLE_DEFAULT_PLUGINS: string;
    OPENCODE_AUTH_CONTENT: string;
    OPENCODE_DISABLE_PROJECT_CONFIG: string;
    OPENCODE_DISABLE_CLAUDE_CODE: string;
    OPENCODE_DISABLE_EXTERNAL_SKILLS: string;
    OPENCODE_DISABLE_LSP_DOWNLOAD: string;
    OPENCODE_DISABLE_MODELS_FETCH: string;
    OPENCODE_EXPERIMENTAL_DISABLE_FILEWATCHER: string;
    OPENCODE_PURE: string;
}>;
export declare function prepareOpenCode(input: OpenCodeInput): Promise<{
    argv: string[];
    env: Record<string, string>;
}>;
/** CLI default zero prices are not affirmative price evidence. */
export declare function parseOpenCodeModels(output: string): ModelChoice[];
export interface OpenCodeDiscoveryOptions extends OpenCodeNativeOptions {
    credentialEnv?: Record<string, string>;
    probeOptions?: Parameters<typeof probeAccountModels>[1];
}
export declare function discoverOpenCode(executable: string, capture: Capture, stateDirectory: string, authDirectory?: string, _managedCredentials?: boolean, options?: OpenCodeDiscoveryOptions): Promise<ModelChoice[]>;
/** Native OpenCode JSONL; success needs clean EOF after stop, identity and no failed tool. */
export declare class OpenCodeProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    private decoder;
    private pending;
    private ended;
    private stopped;
    private sawStep;
    private failure?;
    private response;
    private steps;
    private textParts;
    private openTools;
    private responses;
    conversationId?: string;
    result?: ProtocolResult;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number);
    feed(chunk: Buffer | string): void;
    end(): void;
    private step;
    private id;
    private publicEvent;
    private line;
}
export {};
