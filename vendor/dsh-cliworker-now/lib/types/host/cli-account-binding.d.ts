import { type ClaudeOwnRoute } from './claude-own-route.ts';
import { type CliId } from '../shared/types.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
/** Safe public error; neither secrets nor native paths are interpolated. */
/** A sign-out is told as such, so a caller asks the user to sign in rather than retrying. */
export declare const AGY_SIGNED_OUT = "\u5C1A\u672A\u767B\u5F55 Antigravity\uFF0C\u8BF7\u5728\u300CCLI Worker \u8BBE\u7F6E \u2192 Antigravity\u300D\u70B9\u51FB\u300C\u767B\u5F55\u8D26\u53F7\u300D\u5B8C\u6210\u767B\u5F55\u540E\u518D\u7EE7\u7EED";
export declare class CliAccountBindingError extends Error {
    readonly code = "CLI_OWN_ACCOUNT_REQUIRED";
    constructor(cli: CliId, reason?: string);
}
/** The version of Codex's custom route, or undefined when Codex uses its official account. */
export declare function readCodexCustomRouteVersion(project: string, signal: AbortSignal): Promise<string | undefined>;
/**
 * Workers start from a scrubbed environment. A relay's `env_key` variables, named in
 * Codex's own config, are passed on when the Host has them; nothing else is added.
 */
export declare function codexRouteEnvironment(project: string, signal: AbortSignal): Promise<Record<string, string>>;
/** File-backed Codex auth only. Native keyring/auto cannot use a stale auth.json for model queries. */
export declare function readCodexOwnAccountSource(project: string, signal: AbortSignal): Promise<{
    provider: string;
    credential: {
        type: "api";
        key: string;
    };
    sourceIds: string[];
    baseUrl: string;
    nativeRouteConfirmed: true;
} | {
    provider: string;
    credential: {
        access: any;
        refresh: any;
        accountId: any;
        expires: number | undefined;
        type: "oauth";
    };
    sourceIds: string[];
    baseUrl: string;
    nativeRouteConfirmed: true;
}>;
/** Host-only account epoch. Never return it from a Gateway response or write credentials to storage. */
export declare function readCliAccountBinding(cli: CliId, backend: ProcessBackend, config: RuntimeConfig, project: string, signal: AbortSignal, selectedClaudeRoute?: ClaudeOwnRoute): Promise<string>;
