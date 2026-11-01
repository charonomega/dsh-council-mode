import type { HarnessConversationBinding, HarnessConversationFeature } from '../shared/types.ts';
export declare function harnessFeatureReason(binding: HarnessConversationBinding, feature: HarnessConversationFeature): string | undefined;
/** Without plan mode, accept-edits is the only permission mode, so there is nothing to switch. */
export declare function harnessPermissionReason(binding: HarnessConversationBinding): "当前 CLI 只有“允许编辑”一种权限模式" | undefined;
