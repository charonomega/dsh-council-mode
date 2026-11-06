import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const parts = (message) => message.content.map(block => {
    if (block.type === 'text')
        return { type: 'text', text: block.text };
    if (block.type !== 'image' && block.type !== 'file')
        throw new Error('CLI 不支持该非文本输入');
    const ref = block.attachment;
    if (!ref || typeof ref.attachmentId !== 'string' || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0)
        throw new Error('附件引用无效');
    return { type: block.type, attachment: { attachmentId: ref.attachmentId, bytes: ref.bytes, name: ref.name,
            ...(block.type === 'image' ? { mediaType: block.attachment.mediaType, width: block.attachment.width, height: block.attachment.height } : {}) } };
});
export const hasHarnessAttachments = (message) => message.content.some(block => block.type === 'file' || block.type === 'image');
export function harnessInputText(message) {
    return parts(message).map(block => block.type === 'text' ? block.text : `用户上传附件：${JSON.stringify(block.attachment?.name || '图片')}`).join('');
}
/** Preserve old text-only receipts; attachment bytes/identity participate in new receipts. */
export function harnessInputHash(message) {
    const input = hasHarnessAttachments(message) ? JSON.stringify(parts(message)) : harnessInputText(message);
    return createHash('sha256').update(input).digest('hex');
}
export function resolveHarnessAttachments(ctx, messages) {
    const result = [];
    const store = ctx.get('attachments');
    const fs = ctx.get('fs');
    for (const message of messages) {
        parts(message);
        for (const block of message.content) {
            if (block.type !== 'image' && block.type !== 'file')
                continue;
            const resolve = store?.[block.type === 'image' ? 'imageHostPath' : 'fileHostPath'];
            const hostPath = resolve?.call(store, block.attachment);
            if (!hostPath)
                throw new Error('宿主无法读取该附件，请重新上传');
            const path = fs?.processPathFromHostPath ? fs.processPathFromHostPath(hostPath) : hostPath;
            if (!path)
                throw new Error('附件未映射到当前 CLI 执行环境');
            result.push({ kind: block.type, path, name: block.attachment.name || 'image', bytes: block.attachment.bytes,
                ...(block.type === 'image' ? { mimeType: block.attachment.mediaType } : {}) });
        }
    }
    return result;
}
const IMAGE_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
/** Inline bytes of a host tool's image result, for a CLI whose MCP accepts images. */
export async function readHarnessImage(ctx, ref, signal) {
    const attachment = ref;
    if (typeof attachment?.attachmentId !== 'string' || typeof attachment.mediaType !== 'string' || !IMAGE_MEDIA_TYPES.includes(attachment.mediaType))
        return undefined;
    const store = ctx.get('attachments');
    const path = store?.imageHostPath?.(ref);
    if (!path)
        return undefined;
    return { data: (await readFile(path, { signal })).toString('base64'), mimeType: attachment.mediaType };
}
//# sourceMappingURL=harness-attachments.js.map