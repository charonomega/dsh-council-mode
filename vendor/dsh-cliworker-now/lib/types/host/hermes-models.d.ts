import { type AccountModelScope } from './account-models.mjs';
/** Native PooledCredential fields; a successful catalog cannot erase a native
 * dead account, active exhaustion window or model-specific entitlement bench. */
export declare function hermesPoolEntryUnavailable(entry: Record<string, any>, model?: string): boolean;
/** Internal source material; callers must never publish or log the returned values. */
export declare function readHermesAccountMaterial(home: string, signal?: AbortSignal): Promise<{
    config: Record<string, any>;
    auth: Record<string, any>;
    env: Record<string, string>;
    sourceIds: string[];
}>;
/** Native own stores only; never accept a broad manual:* prefix. */
export declare function assertHermesOwnAccounts(home: string, signal?: AbortSignal): Promise<{
    config: Record<string, any>;
    auth: Record<string, any>;
    env: Record<string, string>;
    sourceIds: string[];
}>;
/** Current selected-provider account scope. Unknown provider/auth schemas fail closed.
 * Route precedence follows Hermes runtime_provider_backends / credential_pool;
 * only the canonical OpenRouter route and native Codex OAuth store are supported
 * without an explicit endpoint. Ambiguous mirrors/custom pools are not guessed. */
export declare function hermesAccountModels(home: string, provider: string, options?: {
    signal?: AbortSignal;
    fetch?: typeof fetch;
}): Promise<AccountModelScope>;
