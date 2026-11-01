import type { NativeRequestState, ExternalRequestState } from '../shared/native-request-state.ts';
import type { Worker, WorkerEvent } from '../shared/types.ts';
/** Only the isolated Hermes observer publishes these metadata frames. */
export declare function parseRequestState(value: Record<string, unknown>, sessionId: string | undefined): NativeRequestState | undefined;
/** Terminal, previous-run and completed requests cannot leave a stale live badge. */
export declare function projectRequestState(worker: Worker, events: readonly WorkerEvent[]): ExternalRequestState | undefined;
