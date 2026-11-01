import { type Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
/** Native menu primitive with the same model / effort drill-in flow as Harness ModelSelect. */
export declare function WorkerModelMenu({ worker, api, sessionId, disabled, disabledReason, }: {
    worker: Worker;
    api: API;
    sessionId: string;
    disabled: boolean;
    disabledReason?: string;
}): import("react/jsx-runtime").JSX.Element;
