import { type CliId, type Worker, type WorkerLevel } from './types.ts';
/** The parent conversation's DSH sandbox tier, which a Worker without its own level follows. */
export type ParentAccess = 'read-only' | 'workspace-write' | 'danger-full-access';
export interface WorkerLevelOption {
    value: WorkerLevel;
    name: string;
    description: string;
}
export interface WorkerPermissionState {
    /** The level this Worker runs with now: its own choice, else the parent's. */
    currentValue: WorkerLevel;
    /** Every level this CLI offers. */
    options: WorkerLevelOption[];
    /** The plan switch is separate from the level. */
    plan: {
        supported: boolean;
        active: boolean;
    };
    writable: boolean;
    reason?: string;
}
/** The level a parent tier stands for. */
export declare const parentLevel: (access: ParentAccess) => WorkerLevel;
/**
 * The level a run uses. A level the user chose in the Worker menu applies to
 * every turn, the main Agent's included (2026-10-29 decision); a Worker
 * without one follows the parent.
 */
export declare function effectiveLevel(level: WorkerLevel | undefined, access: ParentAccess): WorkerLevel;
/** The launch tier adapters receive for a level. */
export declare const levelAccess: (level: WorkerLevel) => ParentAccess;
/** Every level this CLI offers, regardless of the parent. */
export declare function cliLevelOptions(cli: CliId): WorkerLevelOption[];
/** This CLI's name for a level, as the timeline and menu show it. */
export declare function levelName(cli: CliId, level: WorkerLevel): string;
/** Antigravity's 仅规划 runs its first item as a native plan launch. */
export declare const askRunsAsPlan: (cli: CliId) => boolean;
/**
 * Whether a Worker without its own level may run while the parent is 仅可查看.
 * Hermes has no first item, Kimi's auto-approves Git workspace edits, and
 * Antigravity cannot relay a request; those are refused until the user picks a level.
 */
export declare const runsUnderViewOnly: (cli: CliId) => boolean;
/** The menu always lists every level this CLI offers, whatever the parent's tier. */
export declare function workerLevelOptions(worker: Pick<Worker, 'preference'>): WorkerLevelOption[];
/** Whether the CLI has a native plan mode this plugin can launch. */
export declare function workerPlanSupported(worker: Pick<Worker, 'preference' | 'transport'>): boolean;
