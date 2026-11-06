import { type Effort, type ModelChoice } from '../shared/types.ts';
export declare const GROK_MODELS_URL = "https://cli-chat-proxy.grok.com/v1/models";
export declare const GROK_SETTINGS_URL = "https://cli-chat-proxy.grok.com/v1/settings";
/** Read failures keep a reason; the message never carries file content or credential fragments. */
export type GrokAccountReadFailure = 'missing' | 'format' | 'unsafe' | 'read' | 'expired';
export declare class GrokModelsError extends Error {
    readonly reason?: GrokAccountReadFailure | undefined;
    constructor(message: string, reason?: GrokAccountReadFailure | undefined);
}
export declare class GrokAccountReadError extends GrokModelsError {
    constructor(reason: GrokAccountReadFailure);
}
/** Renew this many milliseconds before expiry; Grok itself treats an expiring token as due. */
export declare const GROK_RENEW_MARGIN_MS: number;
/** This adapter supports the fixed first-party route, not ambient provider overrides. */
export declare function assertGrokNativeEnvironment(home?: string): void;
export interface GrokOwnAccount {
    access: string;
    refresh: boolean;
    expires: number;
    active: boolean;
    userId: string;
    clientId: string;
    email?: string;
}
/** Official native OIDC slot and its own identity, not arbitrary configured keys. */
export declare function selectGrokOwnAccount(raw: unknown, now?: number): GrokOwnAccount | undefined;
export declare function readGrokOwnAccount(options?: {
    home?: string;
    signal?: AbortSignal;
}): Promise<{
    fingerprint: string;
    access: string;
    refresh: boolean;
    expires: number;
    active: boolean;
    userId: string;
    clientId: string;
    email?: string;
}>;
/** Only metadata IDs pass out; a successful empty list differs from a failed query. */
export declare function grokAccountModels(payload: unknown, forbidden?: string[]): Map<string, Effort[] | undefined>;
export declare function grokAccountModelIds(payload: unknown, forbidden?: string[]): Set<string>;
/** Installed grok 1.0.0 (3cd0d0cbcebe) consumes these dynamic /models fields.
 * Verified against its actual ACP response using an isolated loopback fixture;
 * the built-in grok-4.5 fallback is not a limit on dynamic model IDs or xhigh.
 */
export declare function grokDynamicNativeModels(payload: unknown, forbidden?: string[]): ModelChoice[];
/** Fixed official Build endpoint; no redirect, plugin-side OAuth refresh, fallback, or generation. */
export declare function discoverGrokAccountModels(native: ModelChoice[], options?: {
    home?: string;
    signal?: AbortSignal;
    fetch?: typeof fetch;
    timeoutMs?: number;
    nativeDynamicSchema?: boolean;
    /** Let the installed Grok renew its own session; never an OAuth request from the plugin. */
    renew?: (signal: AbortSignal) => Promise<void>;
}): Promise<ModelChoice[]>;
