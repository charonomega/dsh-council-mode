import { type ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client';
import type { HarnessConversationBinding, Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
import type { HarnessBindingRegistry, HarnessNativeBinding } from './harness-binding-registry.ts';
declare module '@deepseek-ai/dsh-api-session-controller/client' {
    interface SessionReferenceSourceMap {
        cliworkerConversation: unknown;
    }
}
type NativeServices = Pick<Context, 'sessions'>;
interface HarnessConversationProps {
    services: NativeServices;
    bindings: HarnessBindingRegistry;
    api: API;
    parentSessionId: string;
    worker: Worker;
    renderConversation: (reference: SessionReference) => ReactNode;
    attachProjections?: (reference: SessionReference, binding: HarnessNativeBinding) => () => void;
}
/** Independent occurrences may hold the same child; releasing one must not unlock another. */
export declare function retainHarnessComposerBlock(conversation: Context['conversation'], sessionId: string, reason?: string): () => void;
/** Validate only a Host-issued Harness identity; CLI conversation ids are never substituted. */
export declare function readHarnessConversationBinding(raw: unknown, parentSessionId: string): HarnessConversationBinding;
export declare function harnessComposerBlock(binding: HarnessConversationBinding): string | undefined;
/** Displayed inside the existing Worker details menu, never as extra composer controls. */
export declare function HarnessCapabilityNotes({ binding }: {
    binding: HarnessConversationBinding;
}): import("react/jsx-runtime").JSX.Element;
/** Retain the exact child inside the right sidebar's native Conversation occurrence. */
export declare function HarnessConversation({ services, bindings, api, parentSessionId, worker, renderConversation, attachProjections, }: HarnessConversationProps): import("react/jsx-runtime").JSX.Element;
export {};
