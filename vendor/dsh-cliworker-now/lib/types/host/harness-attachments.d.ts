import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { NativeAttachment } from './native-attachments.mjs';
export declare const hasHarnessAttachments: (message: UserMessage) => boolean;
export declare function harnessInputText(message: UserMessage): string;
/** Preserve old text-only receipts; attachment bytes/identity participate in new receipts. */
export declare function harnessInputHash(message: UserMessage): string;
export declare function resolveHarnessAttachments(ctx: {
    get(name: string): unknown;
}, messages: readonly UserMessage[]): NativeAttachment[];
/** Inline bytes of a host tool's image result, for a CLI whose MCP accepts images. */
export declare function readHarnessImage(ctx: {
    get(name: string): unknown;
}, ref: unknown, signal: AbortSignal): Promise<{
    data: string;
    mimeType: string;
} | undefined>;
