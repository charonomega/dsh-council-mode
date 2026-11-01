import type { CliId, Worker } from './types.ts';
export declare const RUNNING_MESSAGE_MODES: readonly ["steer", "interrupt", "queue"];
export type RunningMessageMode = (typeof RUNNING_MESSAGE_MODES)[number];
export declare const RUNNING_MESSAGE_LABELS: Record<RunningMessageMode, string>;
/** Only protocols with an implemented, acknowledged native steering channel. */
export declare const NATIVE_STEERING_TRANSPORTS: Partial<Record<CliId, string>>;
export declare const supportsNativeSteering: (cli: CliId) => boolean;
/** Legacy Workers keep their original transport; an upgrade never changes their input protocol. */
export declare const supportsWorkerNativeSteering: (worker: Pick<Worker, "preference" | "transport">) => boolean;
export declare const defaultRunningMessageMode: (cli: CliId) => RunningMessageMode;
export interface RunningMessageSettings {
    cli: CliId;
    mode: RunningMessageMode;
    canSteer: boolean;
}
