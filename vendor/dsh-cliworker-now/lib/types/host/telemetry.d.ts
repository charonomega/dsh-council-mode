import type { CliId, TimelineItem } from '../shared/types.ts';
import type { Telemetry, TokenUsage } from '../shared/telemetry.ts';
export interface RunTelemetry extends Telemetry {
    /** A legacy derived counter did not establish settlement for this run. */
    unsettledRunUsage?: true;
    replies: Record<string, TokenUsage>;
    replyDurations?: Record<string, number>;
    finalReply?: TokenUsage;
    /** An authoritative receipt covering this invocation, never a session snapshot. */
    runUsage?: TokenUsage;
}
export interface TelemetryIdentity {
    conversationId?: string;
    /** Actual confirmed provider/model, when available; never a guessed alias translation. */
    model?: string;
    project?: string;
}
/** Only public, observed CLI envelopes; no model-name capacity guesses. */
export declare function extractTelemetry(cli: CliId, records: readonly unknown[], identity?: TelemetryIdentity): RunTelemetry;
/** Read-only projection also recovers telemetry from pre-feature private raw logs.
 * Incremental byte reads keep live polling O(new bytes), with bounded cache/line memory.
 * Malformed/torn records affect telemetry only, never conversation restoration.
 */
export declare class TelemetryReader {
    private cache;
    read(path: string, cli: CliId, identity?: TelemetryIdentity): RunTelemetry;
}
export declare function attachTelemetry(rows: TimelineItem[], runId: string, telemetry: RunTelemetry): void;
