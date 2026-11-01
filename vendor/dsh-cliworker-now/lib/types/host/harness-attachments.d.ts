import type { UserMessage } from '@deepseek-ai/dsh-llm';
import type { NativeAttachment } from './native-attachments.mjs';
export declare const hasHarnessAttachments: (message: UserMessage) => boolean;
export declare function harnessInputText(message: UserMessage): string;
/** Preserve old text-only receipts; attachment bytes/identity participate in new receipts. */
export declare function harnessInputHash(message: UserMessage): string;
export declare function resolveHarnessAttachments(ctx: {
    get(name: string): unknown;
}, messages: readonly UserMessage[]): NativeAttachment[];
