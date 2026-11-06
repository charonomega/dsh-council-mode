import type { AccountAction, AccountSource } from '../shared/accounts.ts';
import { type AccountIdentity } from './account-identity.ts';
import { type RuntimeConfig } from './process.ts';
/** Native shapes from auth_codex.py/auth_xai.py and NousResearch/hermes-agent@6c80c327 auth_nous.py.
 * Explicit own credentials project local login; provider declarations and unknown schemas do not.
 */
export declare function projectHermesIdentity(raw: unknown): AccountIdentity | undefined;
export declare function readHermesAccount(config: RuntimeConfig, signal: AbortSignal): Promise<AccountIdentity>;
export declare function listHermesAccountSources(config: RuntimeConfig, signal: AbortSignal): Promise<{
    id: AccountSource;
    label: string;
}[]>;
/**
 * Hermes' own Nous sign-in (`hermes model`, then Nous) also makes Nous the inference provider;
 * `hermes auth add nous` only stores the login, and `hermes logout --provider nous` resets the
 * provider to auto (rechecked with Hermes 2026-10-30). With no explicit provider no account's
 * models can be listed, so after a Nous login in the plugin's account home the provider is set
 * with Hermes' own `config set`, which also drops the previous provider's route. A provider the
 * user chose stays theirs, and the user's own Hermes home is never changed.
 */
export declare function selectHermesNousAfterLogin(config: RuntimeConfig, executable: string, run: (argv: string[], cwd: string, env: Record<string, string>) => Promise<unknown>, signal: AbortSignal): Promise<boolean>;
export declare function prepareHermesAccount(action: AccountAction, executable: string, project: string, config: RuntimeConfig, signal: AbortSignal, source?: AccountSource, target?: {
    provider?: string;
    login?: string;
}): Promise<{
    argv: string[];
    cwd: string;
    env: Record<string, string>;
    instruction: string;
    cleanup: () => Promise<void>;
}>;
