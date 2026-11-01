import type { Agent } from '@deepseek-ai/dsh-agent';
import type { HarnessConversationApi } from './harness-conversation-types.ts';
import { type Preference, type TaskMode, type Worker, type WorkerSnapshot, type HistoryPage, type CliId, type RoleSnapshot, type QueuedFollowup, type DeliveryState } from '../shared/types.ts';
import { ProcessCleanupUnconfirmedError, type ProcessBackend, type RuntimeConfig } from './process.ts';
import { WorkerStorage } from './storage.ts';
import { type RunningMessageMode } from '../shared/running-message.ts';
import type { NativeAttachment } from './native-attachments.mjs';
import { type WorkerGoal } from '../shared/conversation-features.ts';
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
    private agyContextReader;
    private hermesSessionReader;
    private telemetryReader;
    private supplementalContextReader;
    private nativeTimelineReprojector;
    private readonly stagedForks;
    private tasks;
    private queue;
    private running;
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
    revision: number;
    constructor(storage: WorkerStorage, backend: ProcessBackend, config: RuntimeConfig);
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
    steerMessage(parent: string, id: string, prompt: string, expectedRunId: string, requestId: string, signal?: AbortSignal): Promise<void>;
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
    assertCliEnabled(cli: CliId): void;
    blockOnCleanup(error: ProcessCleanupUnconfirmedError): void;
    /** Read-only metadata owns one CLI's account/cache, never another CLI's admission. */
    blockCatalogOnCleanup(cli: CliId, error: ProcessCleanupUnconfirmedError): void;
    private markCleanupBlocked;
    setCliEnabled(cli: CliId, enabled: boolean): import("../shared/cli-settings.ts").CliSettings;
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
    runUsage(parent: string, id: string, runId: string): import("../shared/telemetry.ts").TokenUsage | undefined;
    /** Independent exact-run credits, using the same bounded native identity checks. */
    runCredits(parent: string, id: string, runId: string): number | undefined;
    history(parent: string, workerId: string, anchor: string, direction: string): HistoryPage;
    configureWorker(parent: string, id: string, preference: Preference): Worker;
    configureWorkerPermission(parent: string, id: string, mode: TaskMode, preparationId?: string): Worker;
    /** Capability and readiness of this exact run; never starts or retries a request. */
    nativeSteeringState(parent: string, id: string): 'ready' | 'pending' | 'unsupported';
    submit(parent: string, project: string, title: string, prompt: string, preference: Preference, mode: TaskMode, previousId?: string, identity?: {
        agentName?: string;
        role?: RoleSnapshot;
    }, authorizedBinding?: string, queuedAdmission?: QueuedAdmission, preparationId?: string, submissionId?: string, attachments?: readonly NativeAttachment[]): Submission;
    attachJob(worker: Worker, jobId: string): void;
    stop(parent: string, id: string): Promise<Worker>;
    private stopCurrent;
    /** A queued task may already own a native account-query process. */
    private finishQueued;
    private drain;
    private finish;
    private run;
    close(): Promise<void>;
}
