import { type ReactNode } from 'react';
import { type TimelineItem, type Worker } from '../shared/types.ts';
export declare function ConversationTimeline({ items, latestItems, worker, messageFeedback, }: {
    items: TimelineItem[];
    latestItems?: TimelineItem[];
    worker?: Worker;
    messageFeedback?: Record<string, ReactNode>;
}): import("react/jsx-runtime").JSX.Element;
