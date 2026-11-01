import type { Context } from '@deepseek-ai/cordis';
import type { HarnessBindingRegistry } from './harness-binding-registry.ts';
import { type API } from './workers.ts';
import type { installHarnessNativeAttachments } from './harness-native-attachments.ts';
export interface HarnessCommandFeatures {
    openFeedback?: (sessionId: string) => void;
    fork?: (sessionId: string) => void;
    forkReason?: (sessionId: string) => string | undefined;
}
type CommandContext = Pick<Context, 'sessions' | 'inputTriggers' | 'commandUi'>;
export declare const HARNESS_COMMAND_SOURCE = "cliworker-settings";
export type HarnessCommandServices = Pick<Context, 'sessions' | 'inputTriggers'>;
export declare const harnessNativeCommandServices: (bindings: HarnessBindingRegistry) => HarnessCommandServices | undefined;
export declare function subscribeHarnessNativeCommands(bindings: HarnessBindingRegistry, listener: () => void): () => void;
/**
 * Data-only source for owned CLI children. DSH owns trigger detection, menu,
 * PopupSelectView, keyboard, token CAS and focus through its existing session
 * controller. No original source, command contribution or component is replaced.
 */
export declare function installHarnessNativeCommands(ctx: CommandContext, bindings: HarnessBindingRegistry, api: API, attachments?: ReturnType<typeof installHarnessNativeAttachments>, features?: HarnessCommandFeatures): () => void;
export {};
