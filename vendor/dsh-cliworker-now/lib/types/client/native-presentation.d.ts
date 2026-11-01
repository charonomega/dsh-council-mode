import { type ReactNode } from 'react';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
export type WorkDetailsMode = 'compact' | 'standard' | 'detailed' | 'verbose';
export interface WorkDetailsPolicy {
    mode: WorkDetailsMode;
    foldCompletedTurns: boolean;
    stepGrouping: 'collapsed' | 'history' | 'none';
    liveProcessDetail: boolean;
    settledReasoningPreview: boolean;
}
export declare function workDetailsPolicy(value: unknown, desktop?: boolean): WorkDetailsPolicy;
export type NativeChatSettings = Pick<ConfigForm<{
    transcriptView?: unknown;
}>, 'getSnapshot' | 'subscribe'>;
/** Only the global presentation preference is read, never a parent Session projection. */
export declare function NativePresentationProvider({ source, children, }: {
    source: NativeChatSettings;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare const useNativePresentation: () => WorkDetailsPolicy;
