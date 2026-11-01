import { type ClaudeOwnRoute } from './claude-own-route.ts';
import { type CliId } from '../shared/types.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
/** Safe public error; neither secrets nor native paths are interpolated. */
export declare class CliAccountBindingError extends Error {
    readonly code = "CLI_OWN_ACCOUNT_REQUIRED";
    constructor(cli: CliId, reason?: string);
}
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
