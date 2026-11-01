/** Counts reported by the CLI. Scope is explicit; snapshots must not be added twice. */
export interface TokenUsage {
    total: number;
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    reasoning?: number;
    /** OMP's explicit provider orchestration charges, separate from its primary response. */
    orchestration?: {
        input?: number;
        output?: number;
        cacheRead?: number;
    };
    scope: 'response' | 'run' | 'session' | 'reported';
}
/** Last verified cumulative receipt, bound to the CLI session that produced it. */
export interface ConversationTelemetryCheckpoint {
    policy: 1;
    cli: import('./types.ts').ActiveCliId;
    conversationId: string;
    runId: string;
    usage: TokenUsage & {
        scope: 'session';
    };
    sessionDurationSeconds?: number;
}
/** A complete prior invocation receipt; it is never a conversation total. */
export interface LastRunUsageSnapshot {
    policy: 1;
    cli: import('./types.ts').ActiveCliId;
    conversationId: string;
    runId: string;
    usage: TokenUsage & {
        scope: 'run';
    };
}
/** Last native window, valid only for this exact CLI session and selected model. */
export interface ContextTelemetryCheckpoint {
    policy: 1;
    cli: import('./types.ts').CliId;
    conversationId: string;
    model: string;
    observedModel?: string;
    runId: string;
    contextUsed?: number;
    /** A CLI-published proportion; never converted into invented token counts. */
    contextRatio?: number;
    contextCapacity?: number;
    contextSource?: string;
    contextCapacitySource?: string;
    contextEstimated?: boolean;
    contextBreakdown?: ContextBreakdown;
}
/** CLI-owned categories. Missing is unknown; categories need not add up to provider usage. */
export interface ContextBreakdown {
    /** Exact CLI category labels and estimates, including categories outside DSH's three buckets. */
    categories?: {
        name: string;
        tokens: number;
        kind: 'used' | 'free' | 'buffer' | 'deferred';
    }[];
    systemTokens?: number;
    toolTokens?: number;
    messageTokens?: number;
    estimated?: boolean;
    source?: string;
}
export interface Telemetry {
    /** Exact Qoder request credits for this invocation; independent from hidden token counters. */
    providerCredits?: number;
    /** Source invocation for the shown receipt, including a prior confirmed run snapshot. */
    usageRunId?: string;
    /** Upstream AGY conversation duration, not the duration of the current invocation. */
    sessionDurationSeconds?: number;
    contextEstimated?: boolean;
    contextSource?: string;
    contextCapacitySource?: string;
    contextBreakdown?: ContextBreakdown;
    usage?: TokenUsage;
    contextUsed?: number;
    contextCapacity?: number;
    /** A CLI-published proportion, independent from an unknown numerator/capacity. */
    contextRatio?: number;
}
export declare function compactTokens(value: number): string;
/** Same calendar-day/year cuts and Chinese templates as Harness formatMessageClock. */
export declare function messageClock(time: string, now?: Date): string;
