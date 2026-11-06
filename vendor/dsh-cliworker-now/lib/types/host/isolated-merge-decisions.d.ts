import type { Worker } from '../shared/types.ts';
import type { MergeResolution, MergeResult } from './isolated-workspace.ts';
/** Largest content the main agent may write for one file, matching the merge baseline limit. */
export declare const MERGE_CONTENT_LIMIT: number;
/** Tells the parent agent that an isolated run's edits still wait in the copy. */
export declare function isolationGuidance(worker: Worker): string | undefined;
/** What the parent agent needs to integrate the files both sides changed. */
export declare function integrationReport(name: string, result: Extract<MergeResult, {
    status: 'conflict';
}>, pending?: readonly string[]): {
    status: "needs_integration";
    agentName: string;
    copy: string;
    files: {
        path: string;
        reason: string;
        choices: import("./isolated-workspace.ts").MergeChoice[];
        versions: {
            base?: string;
            project?: string;
            copy?: string;
        } | undefined;
    }[];
    guidance: string;
};
/** Validates the tool's `resolutions` argument; paths repeat at most once. */
export declare function readResolutions(raw: unknown): Record<string, MergeResolution> | undefined;
