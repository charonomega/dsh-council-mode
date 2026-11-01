import type { AccountIdentity } from './account-identity.ts';
import type { AccountSource } from '../shared/accounts.ts';
import type { PiOmpCli } from './pi-omp-adapter.ts';
export interface PiOmpNativeOptions {
    accountRoot?: string;
    nativeHome?: string;
    signal?: AbortSignal;
    /** Deprecated. Worker copies are never authoritative credential sources. */
    preserveCredentials?: boolean;
    /** Internal runtime mode; direct metadata projections never write native accounts. */
    sharedOAuth?: boolean;
}
export declare const piOmpAccountDirectory: (cli: PiOmpCli, root?: string) => string;
/** Preserve drive and UNC roots instead of treating them as ordinary path components. */
export declare function nativeAccountAncestors(path: string, paths?: {
    resolve: (...paths: string[]) => string;
    parse: (path: string) => import("path").ParsedPath;
    relative: (from: string, to: string) => string;
    join: (...paths: string[]) => string;
    sep: "/" | "\\";
}): string[];
export declare function safePiOmpAncestors(path: string): Promise<void>;
/** Current native roots only. Account actions must never remove a merged worker copy. */
export declare function readPiOmpLogoutSources(cli: PiOmpCli, stateDirectory: string | undefined, signal: AbortSignal, options?: {
    nativeHome?: string;
}): Promise<{
    id: AccountSource;
    label: string;
    directory: string;
    env: Record<string, string>;
    config: Record<string, any>;
    stored: boolean;
    brokerConfigured: boolean;
}[]>;
export declare function listPiOmpAccountSources(cli: PiOmpCli, stateDirectory: string | undefined, signal: AbortSignal, options?: {
    nativeHome?: string;
}): Promise<{
    id: AccountSource;
    label: string;
}[]>;
/** Internal binding material only. Never expose these values through public status. */
export declare function readPiOmpAccountMaterial(cli: PiOmpCli, options?: PiOmpNativeOptions): Promise<{
    auth: any;
    credentials: any[];
    env: Record<string, string>;
    models: {
        providers: any;
    };
    configAuth: any;
    sourceIds: string[];
}>;
/** Global native input then plugin account overrides by provider; empty plugin auth never hides global accounts. */
export declare function snapshotPiOmpNative(cli: PiOmpCli, destination: string, options?: PiOmpNativeOptions): Promise<{
    leaseDirectory?: string | undefined;
    receipt?: {
        version: number;
        cli: PiOmpCli;
        revision: string;
        entries: any[];
        fixed: any[];
    } | undefined;
    configured: boolean;
    expired: boolean;
    providers: string[];
    env: Record<string, string>;
    directory: string;
}>;
export declare function inspectPiOmpNativeAccount(cli: PiOmpCli, stateDirectory: string | undefined, signal: AbortSignal, options?: {
    nativeHome?: string;
}): Promise<AccountIdentity>;
export declare function restorePiOmpEnvironment(directory: string): Promise<Record<string, string>>;
