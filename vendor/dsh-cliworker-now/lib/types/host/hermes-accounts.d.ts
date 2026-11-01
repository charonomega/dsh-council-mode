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
export declare function prepareHermesAccount(action: AccountAction, executable: string, project: string, config: RuntimeConfig, signal: AbortSignal, source?: AccountSource): Promise<{
    argv: string[];
    cwd: string;
    env: Record<string, string>;
    instruction: string;
    cleanup: () => Promise<void>;
}>;
