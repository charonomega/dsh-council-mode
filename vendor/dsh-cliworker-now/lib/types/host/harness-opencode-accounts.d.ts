import type { AccountAction } from '../shared/accounts.ts';
import type { AccountIdentity } from './account-identity.ts';
import type { RuntimeConfig } from './process.ts';
import { type OpenCodeNativeOptions } from './opencode-native.ts';
export declare function readPiOmpAccount(cli: 'pi' | 'omp', config: RuntimeConfig, signal: AbortSignal, options?: {
    nativeHome?: string;
}): Promise<AccountIdentity>;
/** Project only capability metadata, never keys, arbitrary provider metadata or token claims. */
export declare function readOpenCodeAccount(config: RuntimeConfig, signal: AbortSignal, options?: OpenCodeNativeOptions): Promise<AccountIdentity>;
/** User-operated native terminal. No task prompt, slash command, login or logout is injected. */
export declare function prepareOpenCodeAccount(executable: string, action: AccountAction, config: RuntimeConfig, signal: AbortSignal, target?: {
    provider?: string;
    login?: string;
}): Promise<{
    argv: string[];
    env: Record<string, string>;
    cwd: string;
    cleanup: () => void;
    instruction: string;
}>;
