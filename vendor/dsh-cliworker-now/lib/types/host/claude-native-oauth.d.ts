import { type ModelChoice } from '../shared/types.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
export declare class ClaudeNativeOAuthError extends Error {
    readonly code = "CLAUDE_NATIVE_OAUTH_UNAVAILABLE";
    constructor(message?: string);
}
export interface ClaudeNativeOAuthCatalog {
    models: ModelChoice[];
    /** Host-only identity evidence. Do not persist this object or send it through Gateway. */
    account: {
        email: string;
        organization?: string;
    };
    /** 'unknown': the CLI returned no usable plan limits; real calls still enforce them. */
    quota: 'confirmed' | 'unknown';
}
export declare function parseClaudeNativeOAuthCatalog(initialize: unknown, usage: unknown, now?: number): ClaudeNativeOAuthCatalog;
/** Only initialize/get_usage controls are sent. No user message, token read, login or model request. */
export declare function discoverClaudeNativeOAuth(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal, prefixArgs: string[]): Promise<ClaudeNativeOAuthCatalog>;
