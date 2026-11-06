import { type ProcessBackend, type RuntimeConfig } from './process.ts';
import type { AccountProvider } from '../shared/accounts.ts';
export type NativeLoginProvider = AccountProvider & {
    stores?: string;
};
export declare function parseNativeLoginProviders(cli: 'pi' | 'omp', raw: string): NativeLoginProvider[];
/** Successful metadata is cached only for the same installed native entry. */
export declare class NativeLoginProviders {
    private backend;
    private config;
    private cache;
    constructor(backend: ProcessBackend, config: RuntimeConfig);
    read(cli: 'pi' | 'omp', executable: string, signal: AbortSignal): Promise<NativeLoginProvider[]>;
}
