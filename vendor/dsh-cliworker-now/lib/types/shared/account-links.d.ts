import type { CliId } from './types.ts';
/**
 * Sign-in pages each CLI's own login prints, the only addresses a login window
 * may open. `.example.com` also allows subdomains. Checked by Host and Client.
 */
export declare const ACCOUNT_LOGIN_HOSTS: Partial<Record<CliId, readonly string[]>>;
/** An https address on one of `hosts`, without user info; trailing punctuation is not part of it. */
export declare function allowedLink(value: string | undefined, hosts: readonly string[] | undefined): string | undefined;
/** CLIs whose login and logout the plugin draws (Host flows); others keep their native terminal. */
export declare const GUIDED_ACCOUNT_CLIS: ReadonlySet<CliId>;
/** CLIs that hold one account at a time; signing in again means switching accounts. */
export declare const SINGLE_ACCOUNT_CLIS: ReadonlySet<CliId>;
/** CLIs that keep several provider logins; one 「账号」 window lists, adds and signs out each. */
export declare const MULTI_ACCOUNT_CLIS: ReadonlySet<CliId>;
/** Provider ids and credential entry ids are plain native names; never a key, URL or path. */
export declare const ACCOUNT_NAME: RegExp;
/** `cli:provider[:entry]`, the Host handle of one removable login (`AccountLogin.id`). */
export declare function accountLoginId(cli: CliId, provider: string, entry?: string): string | undefined;
export declare function parseAccountLoginId(id: string): {
    cli: string;
    provider: string;
    entry?: string;
} | undefined;
