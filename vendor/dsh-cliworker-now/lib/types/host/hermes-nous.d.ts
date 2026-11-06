import type { Effort } from '../shared/types.ts';
import type { AccountModelScope } from './account-models.mjs';
export declare const NOUS_PORTAL = "https://portal.nousresearch.com";
export declare const NOUS_INFERENCE = "https://inference-api.nousresearch.com/v1";
export declare class HermesNousError extends Error {
    constructor(message: string);
}
export interface HermesNousSource {
    /** Host only. Never serialize this object in a public response or on disk. */
    access: string;
    agentKey: string;
    expires: number;
    email?: string;
    principal: {
        kind: 'oauth';
        subject: string;
        organization: string;
        issuer: string;
        clientId?: string;
    };
    route: {
        portal: string;
        inference: string;
        anthropicWire?: string;
    };
    paidAccess?: boolean;
    modelCooldowns: Record<string, unknown>[];
}
/** Hermes 6c80c327: flat providers.nous, native device-code pool and invoke JWT.
 * No refresh-only, guest, fallback store or different pooled principal is promoted. */
export declare function projectHermesNousSource(auth: any, minTtlSeconds?: number, options?: {
    allowExpired?: boolean;
    allowInactive?: boolean;
}): HermesNousSource;
export declare function hermesNousMinimumTtl(env: Record<string, string>): number;
/** Runtime uses its supported MIN_KEY_TTL override (120s), matching the native
 * invoke-JWT skew. The native default 1800s is a proactive-refresh optimization,
 * not invalid-account evidence. An explicit own-home setting still takes precedence. */
export declare function selectHermesNousSource(material: {
    config: any;
    auth: any;
    env: Record<string, string>;
}, options?: {
    allowExpired?: boolean;
}): HermesNousSource;
export declare function hermesNousEfforts(home: string, source: HermesNousSource, model: string): Effort[];
export declare function beginHermesNousCapabilities(home: string, source: HermesNousSource): symbol;
export declare function forgetHermesNousCapabilities(home: string, source: HermesNousSource, generation: symbol): void;
/** Two read-only, authenticated native endpoints. No public fallback, retry or OAuth refresh. */
export declare function fetchHermesNousModels(home: string, source: HermesNousSource, options?: {
    signal?: AbortSignal;
    fetch?: typeof fetch;
    timeoutMs?: number;
}, generation?: symbol): Promise<AccountModelScope>;
