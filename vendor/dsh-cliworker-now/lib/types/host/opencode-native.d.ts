import type { AccountIdentity } from './account-identity.ts';
export declare const OPENCODE_OAUTH_UNSUPPORTED = "OpenCode OAuth \u6682\u65E0\u6CD5\u5B89\u5168\u7EED\u671F\uFF0C\u8BF7\u4F7F\u7528\u8BE5 CLI \u81EA\u8EAB API \u914D\u7F6E";
export interface OpenCodeNativeOptions {
    nativeHome?: string;
    modelsPath?: string;
    signal?: AbortSignal;
}
export interface OpenCodeNativeProfile {
    sourceIds: string[];
    auth: Record<string, any>;
    providers: Record<string, any>;
    catalog: Record<string, any>;
    modelsPath: string;
    enabled?: string[];
    disabled: string[];
}
/** JSONC comments/trailing commas, without changing quoted model IDs or URLs. */
declare function jsonc(raw: string): unknown;
export { jsonc as parseNativeJsonc };
export declare const activeOpenCodeCredential: (value: unknown) => value is Record<string, any>;
/** A native account terminal may load remote well-known config before provider filters. */
export declare function assertOpenCodeManagedAuth(authDirectory: string, signal?: AbortSignal): Promise<void>;
/** The same native+plugin sources supply metadata queries and worker execution. */
export declare function readOpenCodeProfile(authDirectory: string, options?: OpenCodeNativeOptions): Promise<OpenCodeNativeProfile>;
/** Rebuild a private copy from current own sources; never restore an old worker account. */
export declare function snapshotOpenCodeAuth(authDirectory: string, auth: Record<string, any>, providers: string[], signal?: AbortSignal): Promise<string>;
export declare function inspectOpenCodeProfile(authDirectory: string, options?: OpenCodeNativeOptions): Promise<AccountIdentity>;
