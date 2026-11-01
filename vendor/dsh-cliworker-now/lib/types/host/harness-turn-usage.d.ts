import type { HarnessConversationRecord } from './harness-conversation-types.ts';
import type { ExternalTurnUsage } from '../shared/native-turn-usage.ts';
import type { TokenUsage } from '../shared/telemetry.ts';
import type { Worker, WorkerEvent } from '../shared/types.ts';
import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session';
export interface HarnessTurnObservation {
    header: Pick<SessionHeader, 'id' | 'parentSession' | 'origin'>;
    inheritedEventCount: number;
    events: readonly SessionEvent[];
}
/** Read-only migration: accepted RPC identities and entered, closed turns are the only evidence. */
export declare function recoverHarnessTurnRuns(record: HarnessConversationRecord, worker: Worker, workerEvents: readonly WorkerEvent[], observation: HarnessTurnObservation): HarnessConversationRecord;
/** The route calls this inside its serialized updateRecord transaction. */
export declare function bindHarnessTurnRun(record: HarnessConversationRecord, turn: number, runId: string): HarnessConversationRecord;
/** No Session logs are rewritten. Missing aggregate sources preserve native response receipts. */
export declare function projectExternalTurnUsage(record: HarnessConversationRecord | undefined, worker: Worker, busy: boolean, events: readonly WorkerEvent[], readRunUsage: (runId: string) => TokenUsage | undefined, readRunCredits?: (runId: string) => number | undefined): ExternalTurnUsage;
