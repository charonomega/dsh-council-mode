import type { CliSettings } from '../shared/cli-settings.ts';
import { type RunningMessageMode, type RunningMessageSettings } from '../shared/running-message.ts';
import { type CliId, type Preference, type RolePreset, type RoleSnapshot, type Worker, type WorkerEvent } from '../shared/types.ts';
/** Complete dispatch choices stay Host-private; public preferences omit role and binding. */
export interface DispatchSetup {
    preference: Preference;
    role: RoleSnapshot | null;
    binding: string;
}
export declare function atomicJSON(path: string, value: unknown): void;
/** One host owns a private store; a live second host cannot resume the same CLI session. */
export declare class WorkerStorage {
    readonly directory: string;
    readonly workers: Map<string, Worker>;
    private events;
    private token;
    private lock;
    private candidate;
    private enabled;
    private presets;
    /** Account epochs live outside public Worker records and event/history responses. */
    accountBinding(id: string): string | undefined;
    bindAccount(id: string, binding: string): void;
    /** Private quarantine survives Host restart; absence alone means no recorded quarantine. */
    cleanupBlockState(cli?: CliId): 'none' | 'blocked' | 'invalid';
    /** No automatic clearing: only trustworthy process-exit recovery can release a quarantine. */
    blockCleanup(cli?: CliId): void;
    private cleanupBlockPath;
    constructor(directory: string);
    /** Explicitly authorized one-time native-capability reset; later manual choices use policy 2. */
    private migrateRunningMessageSettings;
    private readRunningMessageRecord;
    /** Only the former CLI-default format and unnamed histories establish legacy automatic names. */
    private migrateAutomaticNames;
    cliSettings(): CliSettings;
    rolePresets(): RolePreset[];
    saveRolePreset(input: unknown): RolePreset;
    deleteRolePreset(id: string): void;
    setCliEnabled(cli: CliId, enabled: boolean): CliSettings;
    private projectKey;
    private readProjectPreference;
    runningMessageSettings(project: string, cli: CliId): RunningMessageSettings;
    setRunningMessageMode(project: string, cli: CliId, mode: RunningMessageMode): RunningMessageSettings;
    preference(project: string, cli?: CliId): Preference | undefined;
    setPreference(project: string, preference: Preference): void;
    dispatchSetup(project: string, cli: CliId): DispatchSetup | undefined;
    setDispatchSetup(project: string, setup: DispatchSetup): void;
    private conversationKey;
    conversationSetup(parent: string, project: string, cli: CliId): DispatchSetup | undefined;
    setConversationSetup(parent: string, project: string, setup: DispatchSetup): void;
    save(worker: Worker): void;
    history(id: string): WorkerEvent[];
    append(worker: Worker, event: Omit<WorkerEvent, 'seq' | 'runId' | 'time'>): void;
    rawPath(worker: Worker): string;
    /**
     * Cross-process exclusion without a native flock: every Host atomically
     * publishes a uniquely named claim, then looks for any other live claim.
     * Two concurrent Hosts each write before they read, so at least one sees the
     * other and withdraws. Stale claims are removed only by their unique name,
     * so a live Host's claim is never deleted by a racing reclaimer.
     */
    private acquireLock;
    close(): void;
}
