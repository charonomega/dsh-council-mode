/** Native auth.py is_source_suppressed accepts provider-scoped lists and legacy
 * dict keys. Removal retains config values; match the exact native source only. */
export declare function hermesSourceSuppressed(auth: unknown, provider: string, source: string): boolean;
/** Safe in-memory view only. Never rewrites native auth, config or environment. */
export declare function projectHermesUnsuppressedAuth(auth: unknown): Record<string, any>;
/** Only the selected provider's env:<NAME> record controls that provider's key. */
export declare function hermesUnsuppressedEnvironment(auth: unknown, env: Record<string, string>, provider: string): Record<string, string>;
