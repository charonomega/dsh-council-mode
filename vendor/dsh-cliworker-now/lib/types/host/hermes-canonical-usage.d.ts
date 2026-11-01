import type { TokenUsage } from '../shared/telemetry.ts';
/** Hermes HTTP, legacy JSON and persisted CanonicalUsage counters lose provider
 * cache-field presence. Their zero means either zero or unreported. Positive
 * counters and the CLI's real inclusive prompt/output/total remain useful.
 * This is deliberately Hermes-only; other protocols may explicitly report zero.
 */
export declare function hermesCanonicalUsage<T extends TokenUsage>(value: T): T;
export declare function hermesCanonicalUsage(value: TokenUsage | undefined): TokenUsage | undefined;
