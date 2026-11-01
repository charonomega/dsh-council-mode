import type { SubprocessHandle, SubprocessSpawnSpec, SubprocessTerminalSpawnSpec, SubprocessTerminalHandle } from '@deepseek-ai/dsh-subprocess';
import type { ModelChoice, Preference, TaskMode } from '../shared/types.ts';
import type { CliExecutablePathStore } from './cli-executable-paths.ts';
import type { NativeHarnessConnection } from './native-harness-tools.ts';
import type { NativeAttachment } from './native-attachments.mjs';
export interface ProcessBackend {
    resolveExecutable(name: string): Promise<string>;
    spawn(spec: SubprocessSpawnSpec): SubprocessHandle;
    spawnTerminal?(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle>;
}
/** A process range is still unconfirmed; callers must stop admitting work. */
export declare class ProcessCleanupUnconfirmedError extends Error {
    constructor();
}
export interface RuntimeConfig {
    /** Host-resolved upload references for one task, never deployment settings. */
    attachments?: readonly NativeAttachment[];
    /** Per-run Host-private tool connection; never persisted as deployment settings. */
    harnessTools?: NativeHarnessConnection;
    /** Host-private machine-local CLI path preferences, shared by all entry points. */
    cliExecutablePaths?: CliExecutablePathStore;
    executable: string;
    codexExecutable?: string;
    claudeExecutable?: string;
    kimiExecutable?: string;
    mimoExecutable?: string;
    zcodeExecutable?: string;
    grokExecutable?: string;
    ompExecutable?: string;
    piExecutable?: string;
    hermesExecutable?: string;
    hermesHome?: string;
    opencodeExecutable?: string;
    qoderExecutable?: string;
    qodercnExecutable?: string;
    zcodeAuthDirectory?: string;
    zcodeBuiltinConfig?: string;
    stateDirectory?: string;
    /** @deprecated Legacy deployment input; own-account isolation ignores it. */
    zaiCredentialRef?: string;
    /** @deprecated Test/old API compatibility only; must never be invoked. */
    resolveCredential?: (ref: string) => Promise<string | undefined>;
    maxConcurrent: number;
    timeoutMs: number;
    graceMs: number;
    maxLineBytes: number;
    maxRunBytes: number;
    maxTimelineItems: number;
}
export declare const DEFAULT_CONFIG: RuntimeConfig;
export declare function projectDirectory(input: string): string;
export declare function agyArguments(executable: string, project: string, preference: Preference, mode: TaskMode, prompt: string, timeoutMs: number, conversationId?: string): string[];
/** Bound discovery and always await managed process cleanup. No agent prompt is sent. */
export declare function discoverModels(backend: ProcessBackend, config: RuntimeConfig, cwd: string, signal: AbortSignal): Promise<ModelChoice[]>;
