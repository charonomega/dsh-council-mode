import type { AccountLogin } from '../shared/accounts.ts';
import type { AccountIdentity } from './account-identity.ts';
/** Display metadata only; the caller must establish current own credential evidence. */
export declare function providerLogin(provider: string, authMethod: AccountLogin['authMethod'], details?: {
    baseUrl?: unknown;
    name?: unknown;
}): AccountLogin;
/** Explicit native API values, excluding placeholders and unevaluated references. */
export declare function usableNativeApiKey(value: unknown): value is string;
export declare function authenticatedAccountLogins(input: AccountLogin[]): AccountIdentity;
