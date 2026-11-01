import { type AccountIdentity, type AccountIdentitySource } from './account-identity.ts';
import type { ProcessBackend, RuntimeConfig } from './process.ts';
type WindowsAgyAccount = {
    identity: AccountIdentity;
    principalHash?: string;
};
/** Only the initial binding and model precheck may share a native projection.
 * The final binding must be read after this operation has exited its scope. */
export declare function withWindowsAgyAccountSnapshot<T>(backend: ProcessBackend, config: RuntimeConfig, signal: AbortSignal, operation: () => Promise<T>): Promise<T>;
/** Secret-free projection of the exact native Windows credential target. */
export declare function projectWindowsAgyAccount(raw: string): WindowsAgyAccount;
export declare function readWindowsAgyAccount(backend: ProcessBackend, config: RuntimeConfig, signal: AbortSignal): Promise<WindowsAgyAccount>;
export declare function nativeAgyAccountIdentity(backend: ProcessBackend, config: RuntimeConfig, platform?: NodeJS.Platform): AccountIdentitySource;
export {};
