import type { AccountAction, ZCodeLoginProvider } from '../shared/accounts.ts';
import { type AccountIdentity } from './account-identity.ts';
import type { ProcessBackend, RuntimeConfig } from './process.ts';
export type ZCodeGrokCli = 'zcode' | 'grok';
export interface ZCodeGrokAccountLaunch {
    argv: string[];
    env: Record<string, string>;
    cwd: string;
    instruction: string;
}
/** Safe to show in the UI; never constructed from native CLI output. */
export declare class ZCodeAccountCapabilityError extends Error {
}
export declare function zcodeGrokInstruction(cli: ZCodeGrokCli, action: AccountAction): string;
/** ZCode 0.16.9 native AES-GCM format. Plaintext never leaves this projection. */
export declare function projectZCodeIdentity(raw: unknown, secret: string): AccountIdentity;
export declare function projectGrokIdentity(raw: unknown, now?: number): AccountIdentity;
/** Bounded, no-follow local read; never returns credentials or native parse errors. */
export declare function zcodeGrokAccountStatus(cli: ZCodeGrokCli, config: RuntimeConfig, signal: AbortSignal, options?: {
    home?: string;
    credentialSecret?: string;
}): Promise<AccountIdentity>;
/** The two installed 0.16.9 builds differ; version strings alone are not a capability check. */
export declare function supportsBigModelLogin(help: string): boolean;
/** Build a user-operated terminal spec. Never starts login or injects terminal input. */
export declare function zcodeGrokAccountLaunch(cli: ZCodeGrokCli, action: AccountAction, executable: string, config: RuntimeConfig, backend: ProcessBackend, signal: AbortSignal, options?: {
    home?: string;
    platform?: NodeJS.Platform;
    loginProvider?: ZCodeLoginProvider;
}): Promise<ZCodeGrokAccountLaunch>;
