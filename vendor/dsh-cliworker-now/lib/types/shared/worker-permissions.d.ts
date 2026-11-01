import { type TaskMode, type Worker } from './types.ts';
export interface WorkerPermissionState {
    currentValue: TaskMode;
    options: Array<{
        value: TaskMode;
        name: string;
        description: string;
    }>;
    writable: boolean;
    reason?: string;
}
/** Existing adapter modes only; DSH full-access/auto are not invented CLI modes. */
export declare function workerPermissionOptions(worker: Pick<Worker, 'preference' | 'transport'>): WorkerPermissionState['options'];
