import { type ComponentType, type ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client';
import type { DshSubagent } from '../shared/types.ts';
import { type API } from './workers.ts';
export declare const DshConversationContext: import("react").Context<{
    child: DshSubagent;
    api: API;
} | undefined>;
export declare function useDshConversation(sessionId?: string): {
    child: DshSubagent;
    api: API;
} | undefined;
export declare function DshSubagentCard({ child, collapsed, onOpen, onHide, busy, }: {
    child: DshSubagent;
    collapsed: boolean;
    busy: boolean;
    onOpen(): void;
    onHide(): void;
}): import("react/jsx-runtime").JSX.Element;
/** Keep the exact native InputBar (including stats, queue, draft and keyboard).
 * Native Session.prompt already routes to DSH subagents.prompt. Only stop's
 * public action is replaced, so its receipt waits for confirmed settlement. */
export declare function DshNativeComposer({ Native, nativeProps, context, }: {
    Native: ComponentType<Record<string, unknown>>;
    nativeProps: Record<string, unknown>;
    context: NonNullable<ReturnType<typeof useDshConversation>>;
}): import("react/jsx-runtime").JSX.Element;
/** Same native child content/SessionProvider as Workers, without CLI bindings
 * or synthetic telemetry. All records and statistics remain native projections. */
export declare function DshConversation({ services, child, api, renderConversation, }: {
    services: Pick<Context, 'sessions' | 'conversation'>;
    child: DshSubagent;
    api: API;
    renderConversation(reference: SessionReference): ReactNode;
}): import("react/jsx-runtime").JSX.Element;
