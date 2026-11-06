/**
 * Plugin-owned project copies for parallel writers. No Git repository is read,
 * created or committed; the copy never contains `.git`.
 */
export declare const ISOLATION_LIMITS: {
    /** Files plus symbolic links copied from the project. */
    maxEntries: number;
    /** Total size of copied regular files. */
    maxBytes: number;
    /** Text files up to this size keep a baseline for three-way merge. */
    maxBaseBytes: number;
    /** Bound for scanning a copy before merge; agents may create build output. */
    maxScanEntries: number;
};
/** Never copied and never merged, at any depth. */
export declare const EXCLUDED_NAMES: ReadonlySet<string>;
/** The copy cannot be created; the task falls back to the serial queue. */
export declare class IsolationUnavailableError extends Error {
    constructor(message: string);
}
export interface WorkspacePaths {
    directory: string;
    copy: string;
    base: string;
    manifest: string;
}
export declare function isolationRoot(stateDirectory: string): string;
export declare function workspacePaths(root: string, workerId: string, project: string): WorkspacePaths;
/**
 * The copy is never validated as a user project: projectDirectory() still
 * rejects the plugin state directory. Only the exact scheduler-owned path for
 * this Worker is accepted, and it must be a real directory.
 */
export declare function assertIsolatedCopy(root: string, workerId: string, project: string): string;
export declare function isolatedCopyExists(root: string, workerId: string, project: string): boolean;
/** Shown to the CLI before the task text; the user prompt itself is unchanged. */
export declare function isolationPromptNotice(copy: string, project: string): string;
/** Relative POSIX path of a link target, or undefined when it can leave the project. */
export declare function insideTarget(path: string, target: string): string | undefined;
/**
 * Copies `project` into this Worker's private workspace and records the
 * baseline. Any failure, limit or cancellation removes the partial copy.
 */
export declare function createIsolatedWorkspace(input: {
    root: string;
    workerId: string;
    project: string;
    signal?: AbortSignal;
    limits?: Partial<typeof ISOLATION_LIMITS>;
}): Promise<{
    path: string;
    skippedLinks: number;
}>;
/** Removes the whole Worker workspace and confirms it is gone. */
export declare function removeIsolatedWorkspace(root: string, workerId: string): Promise<void>;
/** How the main agent may settle a path both sides changed. */
export type MergeChoice = 'project' | 'copy' | 'content';
export interface MergeConflict {
    path: string;
    reason: string;
    /** Structural cases only allow keeping the project version. */
    choices: MergeChoice[];
    /** Readable files of each side, for the main agent to compare. */
    versions?: {
        base?: string;
        project?: string;
        copy?: string;
    };
}
/** The main agent's decision for one path: either side, or content it wrote from both. */
export type MergeResolution = 'copy' | 'project' | {
    content: string;
};
export type MergeResult = {
    status: 'merged';
    written: string[];
    deleted: string[];
    kept: string[];
} | {
    status: 'conflict';
    conflicts: MergeConflict[];
    copy: string;
};
/**
 * Three-way merge of the copy into the project. Nothing is written to the
 * project unless every changed path merges cleanly; the result is a plain
 * uncommitted working-tree change.
 */
export declare function mergeIsolatedWorkspace(input: {
    root: string;
    workerId: string;
    project: string;
    signal?: AbortSignal;
    /** Per-path decisions; while any changed-on-both-sides path lacks one, nothing is written. */
    resolutions?: Readonly<Record<string, MergeResolution>>;
}): Promise<MergeResult>;
