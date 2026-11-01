import { type ModelChoice } from '../shared/types.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
export declare function parseCodexNativeModels(values: unknown[]): ModelChoice[];
/** The native model list is capability metadata; discoverCodexModels separately checks account scope. */
export declare function readCodexNativeModels(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal, options?: {
    onServerVersion?: (version: string) => void;
}): Promise<ModelChoice[]>;
export declare function discoverCodexModels(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal): Promise<ModelChoice[]>;
