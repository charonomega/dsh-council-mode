import type { TaskTimeLimit } from './process.ts';
/** Bridge result errors for a reached limit (`native-time-limit.mjs`). */
export declare const BRIDGE_TIME_LIMIT_ERRORS: {
    readonly total: "Native task timed out";
    readonly idle: "Native task idle timed out";
};
export type TimeLimitKind = keyof typeof BRIDGE_TIME_LIMIT_ERRORS;
export declare function taskTimeLimit(totalMs: number, idleMs: number, now?: number): TaskTimeLimit;
export declare const remainingMs: (limit: TaskTimeLimit, now?: number) => number;
/** The stop reason names which limit ended the task. */
export declare function timeLimitMessage(kind: TimeLimitKind, limit: TaskTimeLimit): string;
/** A bridge run that ended on its own timer: its result error, or the error raised before any session. */
export declare function bridgeTimeLimit(error: unknown): TimeLimitKind | undefined;
