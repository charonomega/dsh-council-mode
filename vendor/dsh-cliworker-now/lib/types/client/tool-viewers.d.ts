import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives';
import type { PublicToolCall } from '../shared/types.ts';
/** Codex FileUpdateChange.diff is a unified patch, never a complete file. */
export declare function patchHunks(path: string, patch: string): DiffHunk[] | undefined;
export declare function nativeFileDiffs(call?: PublicToolCall): DiffHunk[] | undefined;
