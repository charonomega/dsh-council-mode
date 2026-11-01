import type { CliId } from './types.ts';
import type { TokenUsage } from './telemetry.ts';
export interface NativeTokenBuckets {
    uncachedInputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
}
/**
 * Translate the CLI's billing buckets, never sum successive snapshots. The
 * Host already labels run/session/reported scope and deduplicates receipts.
 * Unsupported or inconsistent accounting remains absent in the native UI.
 */
export declare function nativeTokenUsage(cli: CliId, usage?: TokenUsage): NativeTokenBuckets | undefined;
