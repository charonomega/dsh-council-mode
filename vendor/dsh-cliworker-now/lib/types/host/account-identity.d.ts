import type { CliId } from '../shared/types.ts';
import type { AccountStatus } from '../shared/accounts.ts';
export type AccountIdentity = Pick<AccountStatus, 'state' | 'summary' | 'authMethod' | 'accountLabel' | 'verification' | 'logins'>;
export type AccountIdentitySource = (cli: CliId, signal: AbortSignal) => Promise<AccountIdentity | undefined>;
/** Only email is allowlisted. Reject controls/markup/credential-shaped strings outright. */
export declare function accountEmail(value: unknown): string | undefined;
/** Local expiry is negative evidence only; an unsigned claim never proves login. */
export declare function localTokenExpired(value: unknown, now?: number): boolean;
/** Shared by the Linux token file and the macOS keychain item: both hold the same native JSON. */
export declare function agyIdentityFromCredential(value: Record<string, unknown>): AccountIdentity;
/**
 * This format/path is verified from the installed AGY CLI. Reading is
 * bounded and ephemeral. No credential leaves this function; ID tokens are decoded
 * only for a display email, never treated as a remotely verified assertion.
 */
export declare function localAccountIdentity(options?: {
    home?: string;
}): AccountIdentitySource;
