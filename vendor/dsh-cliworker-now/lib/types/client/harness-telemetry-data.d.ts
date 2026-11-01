import type { CliId, HarnessConversationBinding, WorkerSnapshot } from '../shared/types.ts';
export { nativeTokenUsage } from '../shared/native-token-usage.ts';
import type { Telemetry } from '../shared/telemetry.ts';
import { type NativeUsageReport } from '../shared/native-usage-report.ts';
import type { ExternalTurnUsage } from '../shared/native-turn-usage.ts';
import type { ExternalTurnAnswer } from '../shared/native-turn-answer.ts';
import { type TelemetryAvailability, type ExternalRequestState } from '../shared/native-request-state.ts';
/** The exact numeric contracts consumed by the installed rc.2 native leaves. */
export interface NativeTelemetryProjections {
    telemetryAvailability: TelemetryAvailability | undefined;
    externalRequestState: ExternalRequestState | undefined;
    tokenUsage: {
        uncachedInputTokens: number;
        outputTokens: number;
        cacheReadTokens: number;
        cacheWriteTokens: number;
        externalScope?: 'run' | 'reported';
        externalRunId?: string;
        externalIsPrevious?: boolean;
    } | {
        externalUsage: NativeUsageReport;
        externalCredits?: number;
        externalScope?: 'run' | 'reported' | 'session';
        externalRunId?: string;
        externalIsPrevious?: boolean;
    } | {
        externalUsage: undefined;
        externalCredits: number;
        externalScope: 'run';
        externalRunId?: string;
        externalIsPrevious?: boolean;
    } | undefined;
    contextPressure: {
        pressureTokens?: number;
        contextWindow?: number;
        externalContext?: {
            ratio?: number;
            source?: string;
            estimated?: boolean;
            breakdown?: {
                systemTokens?: number;
                toolsTokens?: number;
                messageTokens?: number;
                estimated?: boolean;
                source?: string;
            };
            categories?: {
                name: string;
                tokens: number;
                kind: 'used' | 'free' | 'buffer' | 'deferred';
            }[];
        };
    } | undefined;
    contextBreakdown: {
        systemTokens: number;
        toolsTokens: number;
        messageTokens: number;
    } | undefined;
    externalTurnUsage: ExternalTurnUsage | undefined;
    externalTurnAnswer: ExternalTurnAnswer | undefined;
}
export type NativeTelemetryBinding = HarnessConversationBinding & {
    workerId?: string;
};
export declare function nativeTelemetryProjections(cli: CliId, telemetry?: Telemetry, externalTurnUsage?: ExternalTurnUsage, activeRunId?: string, lifecycle?: {
    busy: boolean;
    externalRequestState?: ExternalRequestState;
    externalTurnAnswer?: ExternalTurnAnswer;
}): NativeTelemetryProjections;
/** Only the exact Host-issued child/Worker pair may supply its telemetry. */
export declare function nativeTelemetryFromSnapshot(binding: NativeTelemetryBinding, snapshot: WorkerSnapshot): {
    cli: CliId;
    telemetry: Telemetry | undefined;
    externalTurnUsage: Readonly<Record<string, import("../shared/native-turn-usage.ts").ExternalRunTurnUsage | null>> | undefined;
    activeRunId: string;
    lifecycle: {
        busy: boolean;
        externalRequestState: ExternalRequestState | undefined;
        externalTurnAnswer: Readonly<Record<string, import("../shared/native-turn-answer.ts").ExternalTurnAnswerAnchor>> | undefined;
    };
} | undefined;
