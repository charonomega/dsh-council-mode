import { type Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
export declare function RenameWorker({ api, sessionId, worker, mode, onClose, }: {
    api: API;
    sessionId: string;
    worker: Worker;
    mode?: 'name' | 'title';
    onClose: () => void;
}): import("react/jsx-runtime").JSX.Element;
