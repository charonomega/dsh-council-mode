import type { Telemetry } from '../shared/telemetry.ts';
/** Hermes CanonicalUsage input excludes cache; its session row stores these exact buckets. */
export declare function hermesSessionTelemetry(row: Record<string, unknown>): Telemetry | undefined;
/** Exact-session, bounded statistics. Only numeric columns are queried or retained. */
export declare class HermesSessionTelemetryReader {
    private cache;
    read(home: string, sessionId: string | undefined, source: 'oneshot' | 'api_server', project: string): Telemetry | undefined;
}
