import type { CliId } from './types.ts';
import type { TokenUsage } from './telemetry.ts';
/** Provider-reported total with only the accounting details the CLI actually supplies. */
export interface NativeUsageReport {
    totalTokens: number;
    inputTokens?: number;
    inputBasis: 'inclusive' | 'uncached' | 'reported';
    outputTokens?: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
    orchestration?: {
        input?: number;
        output?: number;
        cacheRead?: number;
    };
}
/** Partial details never become zero-valued native billing buckets. */
export declare function nativeUsageReport(cli: CliId, usage?: TokenUsage): NativeUsageReport | undefined;
