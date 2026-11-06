import type { RuntimeConfig } from './process.ts';
/** Once explicitly selected, this home remains authoritative even after logout/deletion.
 * The marker is outside native writable account storage and contains no credentials. */
export declare function effectiveHermesHome(config: Pick<RuntimeConfig, 'stateDirectory' | 'hermesHome'>): string;
/** Only an explicit account action establishes this source. Never copy global auth/config. */
export declare function prepareHermesAccountHome(config: Pick<RuntimeConfig, 'stateDirectory' | 'hermesHome'>): string;
/** DSH publishes `[::1]`-style NO_PROXY entries to its children. Hermes' httpx 0.28.1
 * cannot compile a bracketed IPv6 bypass (InvalidURL "Invalid port: ':1]'"), which broke
 * Nous login checks and renewal. Hand Hermes the bare literal, as its own sanitizer does. */
export declare function hermesNoProxyEnvironment(env?: NodeJS.ProcessEnv): Record<string, string>;
export declare function hermesAccountEnvironment(home: string): Record<string, string>;
