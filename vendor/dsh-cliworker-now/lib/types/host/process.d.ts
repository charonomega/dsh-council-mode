import type { SubprocessHandle, SubprocessSpawnSpec, SubprocessTerminalSpawnSpec, SubprocessTerminalHandle } from '@deepseek-ai/dsh-subprocess';
import type { ModelChoice, Preference, TaskMode } from '../shared/types.ts';
import type { CliExecutablePathStore } from './cli-executable-paths.ts';
import type { NativeHarnessConnection } from './native-harness-tools.ts';
import type { NativeAttachment } from './native-attachments.mjs';
import type { NativeAccess } from './native-approval-policy.ts';
export interface ProcessBackend {
    resolveExecutable(name: string): Promise<string>;
    spawn(spec: SubprocessSpawnSpec): SubprocessHandle;
    spawnTerminal?(spec: SubprocessTerminalSpawnSpec): Promise<SubprocessTerminalHandle>;
}
/** A process range is still unconfirmed; callers must stop admitting work. */
export declare class ProcessCleanupUnconfirmedError extends Error {
    constructor(options?: ErrorOptions);
}
/** The host's own reason for an unconfirmed cleanup, for display only: paths removed, one short line. */
export declare function cleanupCauseText(error: ProcessCleanupUnconfirmedError): string | undefined;
/** How long a finished metadata query may take to empty its own process range before it is terminated. */
export declare const METADATA_EXIT_GRACE_MS = 3000;
/** One task's limits, fixed when it starts; settings changed later apply to later tasks only. */
export interface TaskTimeLimit {
    /** Absolute end of the task (epoch ms), shared by every timer of the run. */
    deadlineAt: number;
    /** Total limit this deadline came from, for the timeout note. */
    totalMs: number;
    /** No native event for this long stops the task; 0 is off. */
    idleMs: number;
}
export interface RuntimeConfig {
    /** Per-run time limit snapshot, never deployment settings. */
    timeLimit?: TaskTimeLimit;
    /** Host-resolved upload references for one task, never deployment settings. */
    attachments?: readonly NativeAttachment[];
    /** Per-run Host-private tool connection; never persisted as deployment settings. */
    harnessTools?: NativeHarnessConnection;
    /** Per-run DSH permission tier snapshot; absent keeps the historical workspace mapping. */
    access?: NativeAccess;
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
    /** Initial total task time limit until one is chosen in the CLI Worker settings. */
    timeoutMs: number;
    graceMs: number;
    maxLineBytes: number;
    maxRunBytes: number;
    /** Native CLI inbound single-frame protection, separate from display budgets. */
    maxNativeLineBytes?: number;
    /** Shown output of one native tool step or reasoning block. */
    maxToolPreviewBytes?: number;
    maxTimelineItems: number;
}
export declare const DEFAULT_CONFIG: RuntimeConfig;
export declare function projectDirectory(input: string): string;
export declare function agyArguments(executable: string, project: string, preference: Preference, mode: TaskMode, prompt: string, timeoutMs: number, conversationId?: string, access?: NativeAccess): string[];
/** Bound discovery and always await managed process cleanup. No agent prompt is sent. */
export declare function discoverModels(backend: ProcessBackend, config: RuntimeConfig, cwd: string, signal: AbortSignal): Promise<ModelChoice[]>;
