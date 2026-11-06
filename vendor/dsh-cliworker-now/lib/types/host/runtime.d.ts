import type { Agent } from '@deepseek-ai/dsh-agent';
import type { HarnessConversationApi } from './harness-conversation-types.ts';
import { type Preference, type TaskMode, type Worker, type WorkerLevel, type WorkerSnapshot, type HistoryPage, type CliId, type RoleSnapshot, type QueuedFollowup, type DeliveryState } from '../shared/types.ts';
import { ProcessCleanupUnconfirmedError, type ProcessBackend, type RuntimeConfig } from './process.ts';
import { WorkerStorage } from './storage.ts';
import { type RunningMessageMode } from '../shared/running-message.ts';
import type { GeneralSettings } from '../shared/cli-settings.ts';
import type { TokenUsage } from '../shared/telemetry.ts';
import type { NativeAttachment } from './native-attachments.mjs';
import { type NativeApprovalDecision, type NativeApprovalRequest } from './native-approval-policy.ts';
import { type WorkerGoal } from '../shared/conversation-features.ts';
import { type MergeResolution, type MergeResult } from './isolated-workspace.ts';
export interface Submission {
    worker: Worker;
    done: Promise<Worker>;
    cancel: () => void;
}
export interface QueuedAdmission {
    id: string;
    expectedRunId: string;
    priority?: boolean;
}
export declare class WorkerRuntime {
    readonly storage: WorkerStorage;
    private backend;
    readonly config: RuntimeConfig;
    private harnessPreparation?;
    setHarnessPreparation(prepare: NonNullable<WorkerRuntime['harnessPreparation']>): () => void;
    private approvalHandler?;
    /** Host decision for each native authorization request; absent denies. */
    setApprovalHandler(handler: NonNullable<WorkerRuntime['approvalHandler']>): () => void;
    private accessSnapshot?;
    /** The run's tier (Worker level capped by the parent) and its timeline label, read once at launch. */
    setAccessSnapshot(read: NonNullable<WorkerRuntime['accessSnapshot']>): () => void;
    /**
     * Relay one native authorization request to the Host decision and answer the
     * runner. Every path answers: a missing handler, failure or stop is a denial.
     */
    private relayApproval;
    /**
     * Record and decide one DSH tool authorization raised through this Worker's
     * tool bridge during run `runId`, like a native request. Without that
     * running turn it is a denial.
     */
    harnessApproval(worker: Worker, runId: string, request: NativeApprovalRequest, signal: AbortSignal, decide: (signal: AbortSignal, mode: TaskMode) => Promise<NativeApprovalDecision>): Promise<NativeApprovalDecision>;
    private agyContextReader;
    private hermesSessionReader;
    private telemetryReader;
    private supplementalContextReader;
    private nativeTimelineReprojector;
    private readonly stagedForks;
    private tasks;
    private queue;
    private running;
    private accountRetry?;
    private listeners;
    private disposed;
    private blocked?;
    private catalogBlocked;
    private followups;
    private followupDispatches;
    private followupRuns;
    private followupLauncher?;
    private queuedExecutionGuard?;
    private preparations;
    private priorityHistory;
    private latestPriority;
    private priorityRunners;
    private reservations;
    private stopOperations;
    /** Merge or discard of a Worker's copy; excludes sends and management. */
    private isolationOperations;
    /** Projects whose main directory a merge is writing. */
    private mainWrites;
    private admissions;
    revision: number;
    constructor(storage: WorkerStorage, backend: ProcessBackend, config: RuntimeConfig);
    /** Settles copies left by an earlier Host process; never deletes a ready copy. */
    private recoverIsolation;
    /** Explicit construction policy is overridable by legacy protocol regression fixtures. */
    protected initialTransport(cli: CliId): string | undefined;
    setFollowupLauncher(launch: NonNullable<WorkerRuntime['followupLauncher']>): void;
    setQueuedExecutionGuard(guard: (worker: Worker) => void): void;
    /** Reserve before the Gateway's first await. This never grants execution authority. */
    reserveSubmission(parent: string, id: string, requestId: string): {
        signal: any;
        assertCurrent: () => void;
        release: () => void;
    };
    directMessageReceipt(parent: string, id: string, prompt: string, requestId: string): {
        jobId?: string | undefined;
        workerId: string;
        runId: string;
    } | undefined;
    private accepting;
    private busyReason;
    /** RPC cancellation can settle at the client before native metadata exits. Stop owns this wait. */
    prepareFollowup<T>(parent: string, id: string, signal: AbortSignal, prepare: (signal: AbortSignal, preparationId: string) => Promise<T>, priorityId?: string): Promise<T>;
    sendRunningMessage(parent: string, id: string, prompt: string, expectedRunId: string, requestId: string, signal?: AbortSignal, requestedMode?: RunningMessageMode): Promise<QueuedFollowup | undefined>;
    /** Current-run native input only. Queue state and queue generations never admit or order steering. */
    steerMessage(parent: string, id: string, prompt: string, expectedRunId: string, requestId: string, signal?: AbortSignal): Promise<QueuedFollowup | undefined>;
    /** Every caller of one steer request gets the same queue item once the run's account changed. */
    private steerOrQueue;
    private steerRunningMessage;
    /** Accepted intent survives transport cancellation; only an explicit Stop revokes it. */
    interruptMessage(parent: string, id: string, prompt: string, requestId: string, clientId: string, sequence: number, signal?: AbortSignal): {
        messageId: string;
        revision: number;
        state: DeliveryState;
    };
    private updatePriority;
    private startPriorityRunner;
    interruptQueuedFollowup(parent: string, id: string, queuedId: string, _expectedRunId: string, signal?: AbortSignal): Promise<QueuedFollowup>;
    queueFollowup(parent: string, id: string, prompt: string, expectedRunId: string, requestId: string, workerBound?: boolean): QueuedFollowup;
    cancelQueuedFollowup(parent: string, id: string, queuedId: string): void;
    retryQueuedFollowups(parent: string, id: string, expectedRunId: string): void;
    private pauseFollowups;
    private dispatchFollowup;
    subscribe(callback: () => void): () => void;
    changed(): void;
    /** Shutdown and the unattributed global quarantine refuse every CLI. */
    assertHostOpen(): void;
    assertCliEnabled(cli: CliId): void;
    blockOnCleanup(error: ProcessCleanupUnconfirmedError): void;
    /** Read-only metadata owns one CLI's account/cache, never another CLI's admission. */
    blockCatalogOnCleanup(cli: CliId, error: ProcessCleanupUnconfirmedError): void;
    /** The CLI's own metadata quarantine, if any; the unattributed global one is reported by assertCliEnabled. */
    catalogCleanupMessage(cli: CliId): string | undefined;
    /**
     * The user confirmed no process of this CLI is left. Only a CLI-scoped
     * quarantine is released, and never while this CLI still has work here.
     */
    recoverCatalogCleanup(cli: CliId): void;
    private markCleanupBlocked;
    setCliEnabled(cli: CliId, enabled: boolean): import("../shared/cli-settings.ts").CliSettings;
    /** A saved user choice overrides the deployment config; lowering never stops running work. */
    get maxConcurrent(): number;
    generalSettings(): GeneralSettings;
    setGeneralSettings(patch: unknown): GeneralSettings;
    /** Account mutation must also respect a prior unconfirmed process cleanup. */
    assertAccountIdle(cli: string): void;
    get(parent: string, id: string): Worker;
    /** Exact names are scoped to the owning parent; never select a partial or cross-session match. */
    resolveWorker(parent: string, id?: string, name?: string): Worker;
    private matchesName;
    private checkAgentName;
    renameWorker(parent: string, id: string, name: string): void;
    renameWorkerTitle(parent: string, id: string, title: string): void;
    private goalWorker;
    setWorkerGoal(parent: string, id: string, objective: string, expectedRevision: number): WorkerGoal;
    setWorkerGoalStatus(parent: string, id: string, status: WorkerGoal['status'], expectedRevision: number): WorkerGoal;
    private saveWorkerGoal;
    clearWorkerGoal(parent: string, id: string, expectedRevision: number): void;
    /** Management cannot hide an in-flight task or a process whose cleanup is unresolved. */
    private assertManagedIdle;
    assertLegacyRestart(parent: string, id: string): Worker;
    deleteWorker(parent: string, id: string): void;
    restoreWorker(parent: string, id: string): void;
    private nativeStateDirectory;
    private forkRunSource;
    private assertAfterCarryover;
    /** Metadata only, through the same admitted account, argv builder and owned process backend. */
    private forkNative;
    forkWorker(parent: Agent, id: string, atMessageId: string, bridge: HarnessConversationApi, signal: AbortSignal): Promise<{
        workerId: string;
        childSessionId: string;
    }>;
    private publishFork;
    snapshot(parent: string, selected?: string): WorkerSnapshot;
    private timeline;
    private runTelemetry;
    /** A settled, exact run receipt for the official whole-turn disclosure. */
    runUsage(parent: string, id: string, runId: string): TokenUsage | undefined;
    /** Independent exact-run credits, using the same bounded native identity checks. */
    runCredits(parent: string, id: string, runId: string): number | undefined;
    history(parent: string, workerId: string, anchor: string, direction: string): HistoryPage;
    configureWorker(parent: string, id: string, preference: Preference): Worker;
    /** @param setting - The plan switch (`plan`/`accept-edits`) or a level; the caller enforces the parent cap. */
    configureWorkerPermission(parent: string, id: string, setting: TaskMode | WorkerLevel, preparationId?: string): Worker;
    /** Capability and readiness of this exact run; never starts or retries a request. */
    nativeSteeringState(parent: string, id: string): 'ready' | 'pending' | 'unsupported';
    /** Synchronous admission: concurrent selections cannot overbook the sibling cap. */
    assertSiblingCapacity(parent: string): void;
    submit(parent: string, project: string, title: string, prompt: string, preference: Preference, mode: TaskMode, previousId?: string, identity?: {
        agentName?: string;
        role?: RoleSnapshot;
        initiator?: Worker['initiator'];
    }, authorizedBinding?: string, queuedAdmission?: QueuedAdmission, preparationId?: string, submissionId?: string, attachments?: readonly NativeAttachment[]): Submission;
    attachJob(worker: Worker, jobId: string): void;
    stop(parent: string, id: string): Promise<Worker>;
    private stopCurrent;
    /** A queued task may already own a native account-query process. */
    private finishQueued;
    private drain;
    /**
     * Only a new writer with no native session may move into a copy: CLI
     * sessions are tied to their working directory and cannot change it.
     */
    private canIsolate;
    /** The CLI's working directory: the bound copy, or the project itself. */
    executionDirectory(worker: Worker): string;
    /** Metadata processes need an existing directory; a released copy is recreated only for a turn. */
    catalogDirectory(worker: Worker): string;
    /**
     * Creates (or recreates at the bound path) this Worker's copy. Returns the
     * copy path, or undefined when the task went back to the serial queue.
     */
    private prepareIsolation;
    private finish;
    private run;
    private execute;
    /** Continue this turn in a new native session with the task's own earlier record. */
    private carryOver;
    /**
     * A Pi/OMP OAuth account serves one run at a time. Its process never started,
     * so the turn returns to its queue position without holding a slot.
     */
    private waitForAccount;
    private retryDrain;
    /** Idle, unbound-from-operations Worker with an existing copy. */
    private isolationTarget;
    /** Ends the copy binding after its directory is confirmed gone. */
    private releaseIsolation;
    /**
     * Three-way merge of the copy into the project as uncommitted changes.
     * Nothing is written while any undecided path conflicts; the copy is then kept.
     */
    mergeIsolation(parent: string, id: string, signal?: AbortSignal, resolutions?: Readonly<Record<string, MergeResolution>>): Promise<MergeResult>;
    /** Deletes the copy; reports success only after the directory is gone. */
    discardIsolation(parent: string, id: string): Promise<void>;
    private isolationOperation;
    close(): Promise<void>;
}
