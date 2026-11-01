/** Safe, observed CLI request lifecycle. It is not a retry scheduling policy. */
export interface NativeRequestState {
    nativeRunId: string;
    sequence: number;
    phase: 'requesting' | 'failed' | 'completed';
    statusCode?: number;
    reason?: string;
    retryCount?: number;
    retryable?: boolean;
}
export interface ExternalRequestState extends Omit<NativeRequestState, 'nativeRunId' | 'phase'> {
    runId: string;
    phase: 'requesting' | 'failed';
}
export interface TelemetryAvailability {
    /** The displayed turn/step/timing values describe the Harness-to-CLI call. */
    statisticsBasis?: 'harness-cli-adapter';
    /** Billing unit for providers that expose credits rather than token charges. */
    usageUnit?: 'credits';
    statistics: MetricAvailability;
    tokenUsage: MetricAvailability;
    context: MetricAvailability;
}
export interface MetricAvailability {
    state: 'pending' | 'unavailable';
    reason: 'awaiting-data' | 'not-reported' | 'disconnected';
}
export declare function telemetryAvailability(busy: boolean, disconnected?: boolean): TelemetryAvailability;
