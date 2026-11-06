import { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
export type { Preference, Worker, WorkerSnapshot, ModelChoice, TimelineItem, TaskMode, Effort, WorkerStatus, RolePreset, RoleSnapshot, } from '../shared/types.ts';
/** Deployment settings; all values are resolved by the plugin schema. */
export interface Config {
    /** CLI binary or absolute path (default agy). */
    executable?: string;
    /** Codex CLI executable. */
    codexExecutable?: string;
    /** Claude Code executable. */
    claudeExecutable?: string;
    /** Kimi Code executable. */
    kimiExecutable?: string;
    /** Official Xiaomi MiMo Code executable. */
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
    /** @deprecated Accepted for old deployments only; never read or forwarded. */
    zaiCredentialRef?: string;
    /** Optional private state directory; defaults to DSH_HOME/cliworker-now. */
    stateDirectory?: string;
    /** Maximum concurrent processes (default 2). */
    maxConcurrent?: number;
    /** Maximum turn duration in milliseconds (default 1800000). */
    timeoutMs?: number;
    /** Process termination grace in milliseconds (default 5000). */
    graceMs?: number;
    /** Maximum NDJSON line bytes (default 1048576). */
    maxLineBytes?: number;
    /** Maximum output bytes per run (default 16777216); for native CLIs, the run's display budget. */
    maxRunBytes?: number;
    /** Maximum bytes of one native CLI protocol frame (default 33554432). */
    maxNativeLineBytes?: number;
    /** Maximum shown bytes of one native tool output or reasoning block (default 262144). */
    maxToolPreviewBytes?: number;
    /** Maximum logical timeline rows in one live view (default 1000). */
    maxTimelineItems?: number;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** CLI worker lifecycle and browser API. */ cliworker: CliWorkerService;
    }
}
declare module '@deepseek-ai/dsh-jobs' {
    interface JobKindMap {
        cliworker: 'cliworker';
    }
}
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface RemoteErrorDetailsMap {
        /** CLI worker operation could not proceed; unknown delivery must not be resent. */ 'cliworker/unavailable': {
            reason: string;
            deliveryUnknown?: boolean;
        };
    }
}
/** Host owner of CLI conversations, model tools and Remote streams. */
export declare class CliWorkerService extends TypertRemoteService {
    static inject: string[];
    static Config: z<Config>;
    private runtime;
    private accounts;
    private accountParents;
    private options;
    private backend;
    private pending;
    private dispatchWaits;
    private messageSubmissions;
    private selectionBindings;
    private selectionProjects;
    /** Turn origin by runId: the parent model's tool call, or the user in the Worker UI. */
    private runOrigins?;
    /** Exact per-turn question surface; attribution never controls lifecycle. */
    private runQuestionSessions?;
    /** DSH tool calls the tool bridge is executing, by their DSH call id. */
    private bridgeCalls;
    private displayedBindings;
    private settingsCatalogs?;
    private settingsInstance?;
    private settingsSourceRevisions?;
    private dshSubagents;
    private disposed;
    private harnessConversation?;
    private harnessConversationStore?;
    private nativeRunDone;
    private repairingDisplays;
    /** @param ctx - Harness services. @param config - Validated deployment options. */
    constructor(ctx: Context, config: Config);
    private parent;
    private project;
    /** Resolve ownership only; child status stays read-only even in plan mode. */
    /** CLI Workers win; only an unmatched reference is tried against this conversation's DSH native subagents. */
    private dshFallback;
    private dispatchSubject;
    private siblingDispatch;
    /**
     * @param dispatch - A CLI run (or its control), which 仅可查看 admits in the
     * CLI's native read-only mode. Other project or account writes (merging an
     * isolated copy, account login) stay refused under read-only.
     */
    private assertExecution;
    /**
     * Under 仅可查看 a Worker without its own level runs at its first item: the
     * CLI's native ask mode, or Pi's tool_call gate. A CLI whose first item
     * cannot ask before a change is refused rather than silently weakened: agy's
     * plan launch keeps its terminal sandbox state writable, Kimi's default
     * auto-approves Git workspace edits, and Hermes offers no first item. A level
     * the user picked in the Worker menu runs as picked.
     */
    private assertAccessSupported;
    /** The child session's DSH sandbox and approval policy for a Worker's plan switch and level. */
    private childPermission;
    /** The parent's DSH permission state now: plan mode, sandbox and approval policy. */
    private permissionState;
    /**
     * Decide one native authorization request from the parent's current state.
     * A parent-started turn asks on the parent page; a Worker-UI turn asks in the
     * Worker's own native conversation. Any failure to ask is a denial.
     */
    private decideNativeApproval;
    /**
     * Answer a DSH tool approval raised by a tool bridge call like a native
     * request: a parent-started turn asks on the parent page, a Worker-UI turn
     * keeps the child's own panel. Any other request is not ours.
     */
    private answerHarnessApproval;
    private queryCatalog;
    private freshCatalog;
    /**
     * A Pi/OMP OAuth account is exclusive while another run or catalog read holds
     * it. Dispatch only needs this account's choices to queue the task, and the run
     * authorizes afresh once the account is free, so a busy account uses its last
     * verified catalog. Without one, wait for the short catalog reads to finish.
     */
    private busyAccountCatalog;
    private authorizeChoice;
    private querySelection;
    /** Read installation paths without saving discovery or opening a native account/model process. */
    private resolveDispatchName;
    private chooseQoderVariant;
    /**
     * Serialize only this conversation's questions; a cancelled waiter never owns
     * the question. A settled setup asks nothing, so its catalog check leaves the
     * queue and parallel dispatches of one conversation start together.
     */
    private chooseDispatch;
    private launch;
    private waitHarnessRun;
    /** @param parentSessionId - Owning Harness parent. @param workerId - Existing Worker identity. @param signal - View lifetime. @returns Real native child binding; opening never submits the user task again. */
    ensureHarnessConversation(parentSessionId: string, workerId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Exact owning parent. @param workerId - Existing Worker. @param expectedSessionId - Failed display binding shown by this Client. @param signal - Explicit repair lifetime. @returns Replacement display binding; never submits a CLI prompt. */
    repairHarnessConversation(parentSessionId: string, workerId: string, expectedSessionId: string, signal: AbortSignal): Promise<string>;
    private registerTools;
    /** @param parentSessionId - Main conversation. @param signal - Read lifetime. @returns Native direct children JSON. */
    listDshSubagents(parentSessionId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Main conversation. @param signal - Visible panel lifetime. @returns Native child snapshots. */
    watchDshSubagents(parentSessionId: string, signal: AbortSignal): AsyncIterable<string>;
    /** @param parentSessionId - Main conversation. @param childSessionId - Direct child. @param prompt - Human message. @param requestId - Browser-minted prompt identity. @param signal - Admission lifetime. @returns Native inbox receipt JSON. */
    promptDshSubagent(parentSessionId: string, childSessionId: string, prompt: string, requestId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Main conversation. @param childSessionId - Direct child. @param signal - Stop confirmation lifetime. @returns JSON only after native settlement. */
    stopDshSubagent(parentSessionId: string, childSessionId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Main conversation. @param childSessionId - Direct child. @param signal - Mutation lifetime. @returns Nothing; only plugin visibility changes. */
    hideDshSubagent(parentSessionId: string, childSessionId: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning Harness session. @param workerId - Selected worker or empty string. @param signal - Stream lifetime. @returns JSON snapshots, initially and after changes. */
    watch(parentSessionId: string, workerId: string, signal: AbortSignal): AsyncIterable<string>;
    /** @param parentSessionId - Owning parent session. @param workerId - Worker identity. @param anchor - Stable logical row ID, excluded from the result. @param direction - before or after. @returns JSON historical page, at most 200 rows. */
    history(parentSessionId: string, workerId: string, anchor: string, direction: string): Promise<string>;
    /** @param parentSessionId - Owning Harness session. @param signal - Query lifetime. @returns Profile-wide CLI enablement JSON. */
    cliSettings(parentSessionId: string, signal: AbortSignal): Promise<string>;
    private settingsDisplayMetadata;
    private invalidateSettingsDisplay;
    /** @param parentSessionId - Active parent. @param cli - Explicit CLI. @param signal - Read lifetime. @returns Project/CLI running-message preference and native capability. */
    runningMessageSettings(parentSessionId: string, cli: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Active parent. @param cli - Explicit CLI. @param mode - Running submission preference. @param signal - Save lifetime. @returns Saved preference; never starts a CLI. */
    saveRunningMessageMode(parentSessionId: string, cli: string, mode: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Active parent. @param signal - Query lifetime. @returns JSON role preset library. */
    rolePresets(parentSessionId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Active parent. @param requestJSON - Preset fields, optional existing id. @param signal - Mutation lifetime. @returns Saved preset JSON. */
    saveRolePreset(parentSessionId: string, requestJSON: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Active parent. @param presetId - Preset to delete. @param signal - Mutation lifetime. @returns Completion. */
    deleteRolePreset(parentSessionId: string, presetId: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker identity. @param name - Unique readable name. @param signal - Mutation lifetime. @returns Completion. */
    renameWorker(parentSessionId: string, workerId: string, name: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker identity. @param title - Single-line chat title, at most 160 characters. @param signal - Mutation lifetime. @returns Completion. */
    renameWorkerTitle(parentSessionId: string, workerId: string, title: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker identity. @param objective - Persistent objective. @param expectedRevision - Current goal revision, or zero when absent. @param signal - Mutation lifetime. @returns WorkerGoal JSON. */
    setWorkerGoal(parentSessionId: string, workerId: string, objective: string, expectedRevision: number, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker identity. @param status - Active or paused. @param expectedRevision - Current goal revision. @param signal - Mutation lifetime. @returns WorkerGoal JSON. */
    setWorkerGoalStatus(parentSessionId: string, workerId: string, status: 'active' | 'paused', expectedRevision: number, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker identity. @param expectedRevision - Current goal revision. @param signal - Mutation lifetime. @returns Completion. */
    clearWorkerGoal(parentSessionId: string, workerId: string, expectedRevision: number, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Idle Worker to hide. @param signal - Mutation lifetime. @returns Completion without deleting native data. */
    deleteWorker(parentSessionId: string, workerId: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Deleted Worker identity. @param signal - Mutation lifetime. @returns Completion with the original ID and history. */
    restoreWorker(parentSessionId: string, workerId: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Idle source Worker. @param atMessageId - Completed assistant message, or empty for latest. @param signal - Fork lifetime. @returns Worker and child session identities as JSON. */
    forkWorker(parentSessionId: string, workerId: string, atMessageId: string, signal: AbortSignal): Promise<string>;
    /** Writes into the parent's project, so the host's plan/read-only boundary applies. */
    private mergeIsolatedWorker;
    /** @param parentSessionId - Owning session. @param signal - Query lifetime. @returns Profile-wide general settings JSON. */
    generalSettings(parentSessionId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning session. @param patch - JSON object of changed fields; `null` restores a default. @param signal - Mutation admission lifetime. @returns Updated general settings JSON. */
    saveGeneralSettings(parentSessionId: string, patch: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning session. @param cli - Selected CLI. @param enabled - Allow new CLI operations. @param signal - Mutation admission lifetime. @returns Updated profile-wide CLI enablement JSON. */
    setCliEnabled(parentSessionId: string, cli: string, enabled: boolean, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning session. @param cli - Selected CLI. @param signal - Query lifetime. @returns Safe account status JSON. */
    accountStatus(parentSessionId: string, cli: string, signal: AbortSignal): Promise<string>;
    /** A CLI paused by its own unconfirmed cleanup reports that state instead of failing the read. */
    private cleanupHeldStatus;
    /** @param parentSessionId - Owning session. @param cli - CLI the user confirmed has no leftover process. @param signal - Mutation lifetime. @returns Fresh account status JSON. */
    recoverCliCleanup(parentSessionId: string, cli: string, signal: AbortSignal): Promise<string>;
    private executablePathSnapshot;
    private probeExecutablePath;
    /** @param parentSessionId - Owning session. @param cli - Selected CLI. @param signal - Query lifetime. @returns Machine-local executable path and availability JSON. */
    cliExecutablePath(parentSessionId: string, cli: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning session. @param cli - Selected CLI. @param path - Full file path for manual selection. @param action - manual, refresh or auto. @param signal - Mutation/query lifetime. @returns Saved machine-local path and fresh availability JSON. */
    refreshCliExecutablePath(parentSessionId: string, cli: string, path: string, action: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning session. @param cli - Selected CLI. @param action - Explicit human action. @param signal - Startup lifetime. @returns Managed account terminal identity and instruction JSON. */
    accountStart(parentSessionId: string, cli: string, action: string, signal: AbortSignal): Promise<string>;
    /** @param source - One current CLI-native source, never a filesystem path. */
    accountStartForSource(parentSessionId: string, cli: string, action: string, source: string, signal: AbortSignal): Promise<string>;
    /** @param provider - Explicit ZCode native login provider, never a URL or logout source. */
    accountStartForProvider(parentSessionId: string, cli: string, action: string, provider: string, signal: AbortSignal): Promise<string>;
    /**
     * @param options - JSON `{ provider?, login? }`: a login provider of the window's picker, or
     * one login (`AccountLogin.id`) to sign out. Host checks both against the installed CLI.
     */
    accountStartWith(parentSessionId: string, cli: string, action: string, options: string, signal: AbortSignal): Promise<string>;
    private startAccount;
    /** @param parentSessionId - Owning session. @param accountId - Account terminal identity. @param signal - Stream lifetime. @returns Ephemeral terminal frame JSON. */
    accountWatch(parentSessionId: string, accountId: string, signal: AbortSignal): AsyncIterable<string>;
    /** @param parentSessionId - Owning session. @param accountId - Account terminal identity. @param data - Human keyboard input. @returns Input accepted. */
    accountWrite(parentSessionId: string, accountId: string, data: string): Promise<boolean>;
    /** @param parentSessionId - Owning session. @param accountId - Account terminal identity. @param response - The user's answer to the window's current step (JSON). @returns Answer accepted. */
    accountRespond(parentSessionId: string, accountId: string, response: string): Promise<boolean>;
    /** @param parentSessionId - Owning session. @param accountId - Account terminal identity. @param cols - Visible columns. @param rows - Visible rows. @returns Resize accepted. */
    accountResize(parentSessionId: string, accountId: string, cols: number, rows: number): Promise<boolean>;
    /** @param parentSessionId - Owning session. @param accountId - Account terminal identity. @returns Process cleanup completed. */
    accountStop(parentSessionId: string, accountId: string): Promise<boolean>;
    /** @param parentSessionId - Parent session identity. @param signal - Caller lifetime. @returns JSON model catalog and project preference. */
    catalog(parentSessionId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Parent session identity. @param cli - Selected CLI. @param signal - Caller lifetime. @returns CLI catalog and saved project preference. */
    catalogForCli(parentSessionId: string, cli: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker whose original account scopes the saved choices. @param signal - Caller lifetime. @returns Saved model choices; only a missing valid directory requires discovery. */
    catalogForWorker(parentSessionId: string, workerId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Parent session identity. @param cli - Selected CLI. @param signal - Caller lifetime. @returns Fresh model catalog and saved project preference. */
    refreshCatalogForCli(parentSessionId: string, cli: string, signal: AbortSignal): Promise<string>;
    private settingsCatalog;
    /** @param parentSessionId - Parent session identity. @param selection - JSON model and effort. @param signal - Caller lifetime. @returns Saved JSON preference. */
    configure(parentSessionId: string, selection: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning session. @param workerId - Idle worker. @param selection - JSON preference from saved choices. @param signal - Caller lifetime. @returns Saved preference; execution performs live authorization. */
    configureWorker(parentSessionId: string, workerId: string, selection: string, signal: AbortSignal): Promise<string>;
    private assertNativeWorkerSettingsIdle;
    /** Update a cold child's real Session without activating an Agent or delivering input. */
    private configureColdWorkerPermission;
    /** @param parentSessionId - Owning parent. @param workerId - Exact Worker. @param signal - Read lifetime. @returns Native permission control data; no task or permission change. */
    permissionForWorker(parentSessionId: string, workerId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Exact idle Worker. @param mode - An advertised native CLI mode. @param signal - Save lifetime. @returns Saved Worker; no task is launched. */
    configureWorkerPermission(parentSessionId: string, workerId: string, mode: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Conversation identity. @param requestJSON - Immutable click identity, text, mode and destination. @param signal - Admission lifetime. @returns Exact message acceptance receipt, not native completion. */
    submitMessage(parentSessionId: string, workerId: string, requestJSON: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker to continue after this turn. @param prompt - Unsent message. @param expectedRunId - Run observed by the caller. @param requestId - Stable UUID for retries of this message. @param signal - Admission lifetime. @returns Accepted outbox item JSON. */
    queueFollowup(parentSessionId: string, workerId: string, prompt: string, expectedRunId: string, requestId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Current native Worker. @param prompt - Current-run input. @param expectedRunId - Exact target run. @param requestId - Stable steering identity. @param signal - Receipt lifetime. @returns Native acceptance; never creates or schedules a later turn. */
    steerMessage(parentSessionId: string, workerId: string, prompt: string, expectedRunId: string, requestId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Active Worker. @param prompt - New message. @param expectedRunId - Observed run. @param requestId - Stable submission UUID. @param signal - Admission lifetime. @returns Accepted submission using the saved mode. */
    sendRunningMessage(parentSessionId: string, workerId: string, prompt: string, expectedRunId: string, requestId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Current Worker. @param prompt - Message text. @param requestId - Stable message UUID, including a local queue item. @param clientId - Panel source UUID. @param sequence - Increasing click order for this source. @param signal - Admission transport lifetime. @returns JSON durable acceptance receipt; execution proceeds independently of this RPC. */
    interruptMessage(parentSessionId: string, workerId: string, prompt: string, requestId: string, clientId: string, sequence: number, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Worker with pending messages. @param queuedId - Explicit priority message. @param expectedRunId - Observed run. @param signal - Admission lifetime. @returns JSON priority request receipt with queuedId and snapshot revision; not confirmation of native delivery. */
    interruptQueuedFollowup(parentSessionId: string, workerId: string, queuedId: string, expectedRunId: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning parent. @param workerId - Owning Worker. @param queuedId - Unsent item identity. @param signal - Mutation lifetime. @returns Completion; already admitted messages cannot be cancelled here. */
    cancelQueuedFollowup(parentSessionId: string, workerId: string, queuedId: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Owning parent. @param workerId - Idle Worker with paused messages. @param expectedRunId - Current run identity. @param signal - Mutation lifetime. @returns Explicit queue reactivation; each turn rechecks native authorization. */
    retryQueuedFollowups(parentSessionId: string, workerId: string, expectedRunId: string, signal: AbortSignal): Promise<void>;
    /** @param parentSessionId - Parent session identity. @param workerId - Worker to continue. @param prompt - New task. @param signal - Admission lifetime. @returns Published background receipt. */
    followup(parentSessionId: string, workerId: string, prompt: string, signal: AbortSignal): Promise<string>;
    /** Shared follow-up admission; `origin` decides where this turn's approvals appear. */
    private continueWorker;
    /** @param parentSessionId - Owning parent. @param workerId - Idle legacy history without an account binding. @param prompt - Explicit new-dialog task. @param signal - Admission lifetime. @returns JSON background receipt for a fresh Worker. */
    restartWorker(parentSessionId: string, workerId: string, prompt: string, signal: AbortSignal): Promise<string>;
    /** @param parentSessionId - Owning Harness session. @param workerId - Worker to stop. @returns Final worker state after cleanup. */
    stop(parentSessionId: string, workerId: string): Promise<string>;
}
export default CliWorkerService;
