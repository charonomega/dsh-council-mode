/** Native standalone-account-provider-runtime.js identity binding (ZCode 0.16.9).
 * Keys remain in the Host and are used only for the corresponding native route.
 * OAuth access/refresh tokens and old identities are deliberately not fallbacks.
 */
export declare function readZCodeAccountBindings(authDirectory: string, providerIds: string[], options?: {
    signal?: AbortSignal;
    credentialSecret?: string;
}): Promise<Map<string, {
    identity: string;
    key: string;
}>>;
/** Key-only view retained for account-scoped metadata queries. */
export declare function readZCodeAccountApiKeys(authDirectory: string, providerIds: string[], options?: {
    signal?: AbortSignal;
    credentialSecret?: string;
}): Promise<Map<string, string>>;
