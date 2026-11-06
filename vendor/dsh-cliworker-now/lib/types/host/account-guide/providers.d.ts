import type { AccountLogin, AccountProvider } from '../../shared/accounts.ts';
import type { CliId } from '../../shared/types.ts';
export type Entry = Omit<AccountProvider, 'signedIn'> & {
    /** The provider the CLI files this login under, when it differs from the id. */
    stores?: string;
};
/** The providers a login window may sign in to directly, marked when a removable login already holds one. */
export declare function loginProviders(cli: CliId, logins: AccountLogin[] | undefined, native?: Entry[]): AccountProvider[] | undefined;
export declare function isLoginProvider(cli: CliId, provider: string, native?: Entry[]): boolean;
/** The provider a login of this id is filed under. */
export declare function providerStores(cli: CliId, provider: string, native?: Entry[]): string | undefined;
