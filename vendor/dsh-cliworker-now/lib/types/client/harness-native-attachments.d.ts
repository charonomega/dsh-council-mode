import type { Context } from '@deepseek-ai/cordis';
import type { ClientSessionContext, InputTriggerCandidate, InputTriggerPick } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { HarnessBindingRegistry } from './harness-binding-registry.ts';
type Services = Pick<Context, 'sessions' | 'conversation' | 'inputTriggers'>;
/** Public native input/codec contracts; ordinary Desktop files stay path references,
 * exactly as in Harness's root composer. Images keep the native upload/Inbox owner. */
export declare function installHarnessNativeAttachments(ctx: Services, bindings: HarnessBindingRegistry): {
    /** Every available row; the command source sections or ranks them. */
    candidates(sessionId: ClientSessionContext["sessionId"]): readonly (InputTriggerCandidate & {
        section: "add";
    })[];
    pick(pick: InputTriggerPick): boolean;
    dispose(): void;
};
export {};
