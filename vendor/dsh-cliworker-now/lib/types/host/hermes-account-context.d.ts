import type { RuntimeConfig } from './process.ts';
/** Once explicitly selected, this home remains authoritative even after logout/deletion.
 * The marker is outside native writable account storage and contains no credentials. */
export declare function effectiveHermesHome(config: Pick<RuntimeConfig, 'stateDirectory' | 'hermesHome'>): string;
/** Only an explicit account action establishes this source. Never copy global auth/config. */
export declare function prepareHermesAccountHome(config: Pick<RuntimeConfig, 'stateDirectory' | 'hermesHome'>): string;
/** Native account selectors must not inherit a Host-managed overlay or secret helper. */
export declare function hermesAccountEnvironment(home: string): Record<string, string>;
