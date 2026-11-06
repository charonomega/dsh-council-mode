import { type AccountIdentitySource } from './account-identity.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
/** agy 1.4.x stores its macOS login through go-keyring; the Windows target is `gemini:antigravity`. */
export declare const MAC_AGY_KEYCHAIN_ARGUMENTS: readonly ["/usr/bin/security", "find-generic-password", "-s", "gemini", "-a", "antigravity", "-w"];
export declare class MacAgyKeychainError extends Error {
    constructor();
}
/** go-keyring's own encodings for values that `security -w` cannot print verbatim. */
export declare function decodeMacAgyKeychain(output: string): Record<string, unknown> | undefined;
/**
 * The keychain item is the only macOS login: `/logout` removes it and leaves a
 * stale token file behind, so a missing item is never answered from that file.
 */
export declare function readMacAgyCredential(backend: ProcessBackend, config: RuntimeConfig, signal: AbortSignal): Promise<Record<string, unknown> | undefined>;
export declare function macAgyAccountIdentity(backend: ProcessBackend, config: RuntimeConfig): AccountIdentitySource;
