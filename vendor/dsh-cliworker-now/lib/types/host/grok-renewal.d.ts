import { GrokModelsError } from './grok-models.ts';
import { type ProcessBackend } from './process.ts';
/**
 * Grok renews its own OIDC session (refresh token, IdP request, locked atomic
 * write) whenever an authenticated command finds the access token due. The
 * plugin only starts that native command against the user's own auth file and
 * rereads the result; it never sends an OAuth request or reads a refresh token.
 * Verified 2026-11-06: `grok models` 1.0.50 (Windows) renewed an access token
 * expired for 854 minutes in 3.3 s, same identity, logging `auth: silent refresh`
 * with outcome `Renewed`.
 */
export type GrokRenewalFailure = 'relogin' | 'unavailable' | 'changed' | 'unsupported' | 'busy';
export declare class GrokRenewalError extends GrokModelsError {
    readonly state: GrokRenewalFailure;
    constructor(state: GrokRenewalFailure);
}
export interface GrokRenewalInput {
    backend: ProcessBackend;
    executable: string;
    /** A fresh private Grok home/tmp prepared like the catalog state (no leader, no telemetry). */
    env: Record<string, string>;
    cwd: string;
    /** Grok's own log in that private home; only `auth: silent refresh` outcomes are read. */
    logPath: string;
    signal: AbortSignal;
    graceMs?: number;
    home?: string;
    timeoutMs?: number;
}
/** Whether Grok refused to renew exactly this credential file (it changes after any re-login). */
export declare function grokRenewalRejected(fingerprint: string): boolean;
/** The native auth path for renewal: always the user's real file, never a worker's link to it. */
export declare function grokNativeAuthPath(home?: string): string;
/** Only a fixed message and its outcome value leave the bounded log scan. */
export declare function grokRenewalOutcome(logPath: string): Promise<string | undefined>;
/** Share only an in-flight renewal, never a completed authorization decision. */
export declare function ensureGrokAccessFresh(input: GrokRenewalInput): Promise<void>;
/** Hold off renewal while a Grok account terminal runs; wait for a renewal already writing. */
export declare function reserveGrokAccount(signal: AbortSignal, home?: string): Promise<() => void>;
/** Test hook: forget Host-memory renewal state. */
export declare function resetGrokRenewalState(): void;
