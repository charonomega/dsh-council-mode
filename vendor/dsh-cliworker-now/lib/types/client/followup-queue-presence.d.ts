import { type ReactNode } from 'react';
import type { QueuedFollowup } from '../shared/types.ts';
export interface FollowupQueuePresenceProps {
    scopeKey: string;
    items: QueuedFollowup[];
    expanded: boolean;
    bodyId: string;
    heading: (count: number) => ReactNode;
    renderItem: (item: QueuedFollowup, index: number) => ReactNode;
}
/** Scope changes must never carry a previous conversation's fading messages. */
export declare function FollowupQueuePresence(props: FollowupQueuePresenceProps): import("react/jsx-runtime").JSX.Element;
