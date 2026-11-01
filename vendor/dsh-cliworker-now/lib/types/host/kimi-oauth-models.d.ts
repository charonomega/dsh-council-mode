import type { FirstPartyModelSource } from './first-party-models.ts';
import type { AccountModelScope, probeAccountModels } from './account-models.mjs';
export declare class KimiOAuthModelError extends Error {
    readonly code = "KIMI_OAUTH_UNAVAILABLE";
    constructor(message: string);
}
/** This is host-only credential material. Do not return it through Gateway or persist it. */
export declare function readKimiOAuthModelSources(raw: unknown, sourceId: string, signal: AbortSignal, options?: {
    home?: string;
    now?: number;
}): Promise<FirstPartyModelSource[]>;
/** Current native subscription quota is required; a public models list is never sufficient. */
export declare function kimiQuotaRemaining(raw: unknown): 'available' | 'exhausted' | 'unknown';
export declare function probeKimiOAuthModels(source: FirstPartyModelSource, options?: Parameters<typeof probeAccountModels>[1]): Promise<AccountModelScope>;
