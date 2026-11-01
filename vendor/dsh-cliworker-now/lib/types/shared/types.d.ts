import type { ConversationTelemetryCheckpoint, ContextTelemetryCheckpoint, LastRunUsageSnapshot, Telemetry, TokenUsage } from './telemetry.ts';
import type { RunningMessageMode } from './running-message.ts';
export declare const EFFORTS: readonly ["default", "none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"];
export declare const CLI_IDS: readonly ["antigravity", "codex", "claude", "kimi", "mimo", "zcode", "grok", "omp", "pi", "hermes", "opencode", "qoder", "qodercn"];
export type ActiveCliId = (typeof CLI_IDS)[number];
/** Retired IDs remain readable in existing worker history, never selectable for execution. */
export type CliId = ActiveCliId | 'harness';
export declare const RETIRED_HARNESS_NOTICE = "\u5916\u90E8 Harness CLI \u5165\u53E3\u5DF2\u79FB\u9664\uFF1B\u5386\u53F2\u8BB0\u5F55\u4EC5\u4F9B\u67E5\u770B\u3002\u8BF7\u65B0\u5EFA Hermes Agent \u4EFB\u52A1\u3002";
export declare const isRetiredCli: (cli: CliId) => cli is "harness";
export declare const CLI_LABELS: Record<CliId, string>;
/** Short CLI stems used for automatic Worker names; protocol IDs remain unchanged. */
export declare const CLI_SHORT_NAMES: Record<CliId, string>;
export declare const cliOf: (preference: Preference) => CliId;
export declare const effortLabel: (effort: string) => string;
export declare const LEGACY_ACCOUNT_RECORD_NOTICE = "\u6B64\u5386\u53F2\u4EFB\u52A1\u7F3A\u5C11\u8D26\u53F7\u8BB0\u5F55\uFF0C\u8BF7\u65B0\u5EFA\u4EFB\u52A1";
export type Effort = (typeof EFFORTS)[number];
export type WorkerStatus = 'queued' | 'running' | 'stopping' | 'completed' | 'failed' | 'interrupted' | 'uncertain';
export type TaskMode = 'plan' | 'accept-edits';
export interface Preference {
    /** Missing in v0.1.x data means Antigravity. */
    cli?: CliId;
    model: string;
    effort: Effort;
}
export interface ModelChoice {
    id: string;
    label: string;
    /** Explicit native cost evidence only; missing/default zero prices are unknown. */
    cost?: 'free' | 'paid' | 'unknown';
    efforts?: Effort[];
    /** Exact CLI model IDs for the supported effort variants. */
    variants?: Partial<Record<Effort, string>>;
}
/** User-editable role library. Prompts are user instructions, never executable HTML. */
export interface RolePreset {
    id: string;
    name: string;
    summary: string;
    prompt: string;
    builtin?: boolean;
    source?: string;
}
/** Frozen when a worker is created; library edits cannot change an existing conversation. */
export interface RoleSnapshot {
    presetId?: string;
    name: string;
    summary: string;
    prompt: string;
}
export interface Worker {
    id: string;
    parentSessionId: string;
    project: string;
    title: string;
    agentName?: string;
    /** Provenance distinguishes automatic names from user-supplied lookalikes. */
    agentNameOrigin?: 'auto' | 'custom';
    /** Exact former automatic names reserved for compatible historical references. */
    nameAliases?: string[];
    /** Reversible deletion keeps the original Worker, native session and account binding. */
    archivedAt?: string;
    role?: RoleSnapshot;
    preference: Preference;
    mode: TaskMode;
    conversationId?: string;
    /** A session receipt is replaced, never added to another invocation's cumulative receipt. */
    conversationTelemetry?: ConversationTelemetryCheckpoint;
    /** Last full run receipt, kept independently from session cumulative accounting. */
    lastRunUsageSnapshot?: LastRunUsageSnapshot;
    /** Last verified native window; never derived from cumulative accounting. */
    contextTelemetry?: ContextTelemetryCheckpoint;
    /** Changing the selected model invalidates this run's context, including after restart. */
    contextInvalidatedRunId?: string;
    /** Harness owns this child; the CLI's native conversationId remains separate. */
    harnessConversation?: HarnessConversationBinding;
    /** Native transport is pinned per Worker; missing values retain legacy sessions. */
    transport?: string;
    /** Plugin-owned persistent objective, injected into each turn (see conversation-features.ts). */
    goal?: import('./conversation-features.ts').WorkerGoal;
    /** Last goal revision; kept after clearing so a stale request cannot match a new goal. */
    goalRevision?: number;
    status: WorkerStatus;
    createdAt: string;
    updatedAt: string;
    runId: string;
    jobId?: string;
    error?: string;
    /** User-requested stop confirmed after the owned process range exited. */
    interruptionReason?: 'user';
    observedModel?: string;
    lastResult?: string;
}
export type HarnessConversationFeature = 'send' | 'queue' | 'steer' | 'stop' | 'model' | 'permission' | 'plan' | 'attachments' | 'fork' | 'forkEarlier' | 'goal' | 'feedback' | 'skills' | 'tools';
export interface HarnessConversationBinding {
    sessionId: string;
    parentSessionId: string;
    mode: 'continuable';
    capabilities: Record<HarnessConversationFeature, boolean>;
    reasons?: Partial<Record<HarnessConversationFeature, string>>;
}
/** Exact legacy stop messages are compatible; other interrupted outcomes stay diagnostic. */
export declare const isUserInterrupted: (worker: Pick<Worker, "status" | "error" | "interruptionReason">) => boolean;
/** Stable, non-mutating name for histories created before named workers. */
export declare const workerName: (worker: Worker) => string;
export type DeliveryState = 'pending' | 'admitted' | 'running' | 'superseded' | 'cancelled' | 'failed' | 'completed';
/** Only explicitly published native tool fields; absent identity never creates a parent edge. */
export interface PublicToolCall {
    callId?: string;
    parentCallId?: string;
    name?: string;
    input?: unknown;
    output?: unknown;
    command?: string;
    exitCode?: number;
}
/** One proven CLI model response. Counts are disjoint, never run/session totals. */
export interface NativeResponseUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
}
export interface NativeResponseIdentity {
    id: string;
    blockId: string;
    index: number;
    /** The producer observed the response boundary, not merely one display row ending. */
    complete?: true;
    usage?: NativeResponseUsage;
}
export interface WorkerEvent {
    requestState?: import('./native-request-state.ts').NativeRequestState;
    seq: number;
    runId: string;
    time: string;
    kind: 'user' | 'assistant' | 'reasoning' | 'tool' | 'status' | 'diagnostic' | 'result' | 'submission';
    text: string;
    observedModel?: string;
    step?: number;
    state?: string;
    detail?: string;
    toolCall?: PublicToolCall;
    response?: NativeResponseIdentity;
    /** Whether the terminal body covers all response segments or only the final response. */
    resultScope?: 'run' | 'response';
    /** Exact persisted outbox item admitted into this run; admission is not native delivery. */
    queuedFollowupId?: string;
    /** Submission intent is distinct from a native run. */
    deliveryState?: DeliveryState;
    deliveryError?: string;
    admittedRunId?: string;
    submissionClientId?: string;
    submissionSequence?: number;
}
export interface TimelineItem {
    response?: NativeResponseIdentity;
    /** Exact run credits appear only on its final reply. */
    providerCredits?: number;
    usage?: TokenUsage;
    /** Duration reported for this individual response step; never added to session totals. */
    durationSeconds?: number;
    /** Upstream AGY conversation total, distinct from the locally timed run. */
    sessionDurationSeconds?: number;
    id: string;
    kind: WorkerEvent['kind'];
    text: string;
    time: string;
    state?: string;
    detail?: string;
    toolCall?: PublicToolCall;
    queuedFollowupId?: string;
    deliveryState?: DeliveryState;
    deliveryError?: string;
    admittedRunId?: string;
    submissionClientId?: string;
    submissionSequence?: number;
    /** Run ended without a final tool status; the observed CLI state stays intact. */
    runStatus?: WorkerStatus;
    runStartedAt?: string;
    runEndedAt?: string;
    runOutcome?: WorkerStatus;
}
export interface QueuedFollowup {
    id: string;
    prompt: string;
    createdAt: string;
    state: 'pending' | 'sending' | 'paused';
    pauseReason?: string;
}
export interface WorkerSnapshot {
    externalRequestState?: import('./native-request-state.ts').ExternalRequestState;
    /** Exact selected child turn/run totals; never added to native response usage. */
    externalTurnUsage?: import('./native-turn-usage.ts').ExternalTurnUsage;
    externalTurnAnswer?: import('./native-turn-answer.ts').ExternalTurnAnswer;
    /** Includes early acceptance, preparation, pending work and process cleanup. */
    selectedBusy?: boolean;
    selectedBusyReason?: 'accepting' | 'preparing' | 'queued' | 'running' | 'stopping' | 'priority';
    telemetry?: Telemetry;
    workers: Worker[];
    archivedWorkers?: Worker[];
    selected?: Worker;
    /** Safe selected-Worker admission information; never exposes account identities. */
    resumeBlockedReason?: string;
    /** Accepted messages for the selected Worker; not delivered to the CLI yet. */
    queuedFollowups?: QueuedFollowup[];
    /** Current project/CLI preference for submissions during an active turn. */
    runningMessageMode?: RunningMessageMode;
    runningMessageModeReason?: string;
    timeline: TimelineItem[];
    revision: number;
    truncated: boolean;
}
/** A bounded, frozen reading page; indexes/count refer to the moment it was read. */
export interface HistoryPage {
    workerId: string;
    items: TimelineItem[];
    start: number;
    end: number;
    total: number;
    hasOlder: boolean;
    hasNewer: boolean;
}
export declare const active: (status: WorkerStatus) => status is "queued" | "running" | "stopping";
/** Fold repeated step updates without duplicating streamed text or the final response. */
export declare function foldEvents(events: readonly WorkerEvent[], endedRun?: {
    runId: string;
    status: WorkerStatus;
}, cli?: CliId): TimelineItem[];
