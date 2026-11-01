import { z } from 'zod';
import type { AskUserQuestionAnswer, AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions/types';
import type { RolePreset, RoleSnapshot, Worker } from '../shared/types.ts';
export declare const agentNameSchema: z.ZodString;
export declare const workerTitleSchema: z.ZodString;
export declare const roleSnapshotSchema: z.ZodObject<{
    presetId: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    summary: z.ZodString;
    prompt: z.ZodString;
}, z.core.$strip>;
export declare const rolePresetSchema: z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    prompt: z.ZodString;
    id: z.ZodString;
    builtin: z.ZodOptional<z.ZodBoolean>;
    source: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const rolePresetInputSchema: z.ZodObject<{
    name: z.ZodString;
    summary: z.ZodString;
    prompt: z.ZodString;
    id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const NO_ROLE_LABEL = "\u4E0D\u4F7F\u7528\u89D2\u8272\u9884\u8BBE";
export declare function roleSnapshot(preset: RolePreset): RoleSnapshot;
/** Snapshot the offered list before showing this question; parsing uses that same list. */
export declare function roleQuestion(presets: RolePreset[]): AskUserQuestionItem;
export declare function readRoleAnswer(presets: RolePreset[], response: AskUserQuestionAnswer): RoleSnapshot | undefined;
export declare function askRolePreset(presets: RolePreset[], ask: (questions: AskUserQuestionItem[]) => Promise<AskUserQuestionAnswer>, signal: AbortSignal): Promise<RoleSnapshot | undefined>;
export declare function availableAgentName(workers: Iterable<Worker>, parent: string, base: string): string;
/** Role is prepended only for a fresh CLI conversation. Timeline keeps the task verbatim. */
export declare function promptForWorker(worker: Worker, task: string): string;
