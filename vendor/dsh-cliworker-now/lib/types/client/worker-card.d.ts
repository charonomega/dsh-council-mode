import { type Worker } from '../shared/types.ts';
export type WorkerManagementAction = 'title' | 'name' | 'delete';
export declare function WorkerCard({ worker, collapsed, unavailable, busy, onOpen, onManage, }: {
    worker: Worker;
    collapsed: boolean;
    unavailable: boolean;
    busy: boolean;
    onOpen: () => void;
    onManage: (action: WorkerManagementAction) => void;
}): import("react/jsx-runtime").JSX.Element;
