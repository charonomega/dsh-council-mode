import type { ExternalTurnAnswer } from '../shared/native-turn-answer.ts';
import type { Worker, WorkerEvent } from '../shared/types.ts';
import type { HarnessConversationRecord } from './harness-conversation-types.ts';
import type { HarnessTurnObservation } from './harness-turn-usage.ts';
/** Restore only the location of a proven legacy answer, without rewriting any Session or CLI data. */
export declare function projectExternalTurnAnswer(record: HarnessConversationRecord | undefined, worker: Worker, workerEvents: readonly WorkerEvent[], observation: HarnessTurnObservation): ExternalTurnAnswer;
