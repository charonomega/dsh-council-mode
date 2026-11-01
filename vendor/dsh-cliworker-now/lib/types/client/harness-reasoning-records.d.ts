import { type ComponentType, type ReactNode } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { type HarnessBindingRegistry } from './harness-binding-registry.ts';
export type ReasoningRecordsProps = PropsRuntime<'conversation.session.header.utilities'> & {
    t: (key: string, ...args: unknown[]) => string;
    renderSlot: (name: string, owner: unknown, ...args: unknown[]) => ReactNode;
};
type NativeAssistant = ComponentType<ReasoningRecordsProps>;
/** The native ReasoningRow stays INSIDE its Turn process and in tool-step order.
 * Only its label and expanded body's scrolling change. Native public blocks own
 * content, streaming previews, disclosure/reset state and historical persistence.
 */
export declare function HarnessReasoningRecords({ Native, bindings, props }: {
    Native: NativeAssistant;
    bindings: HarnessBindingRegistry;
    props: ReasoningRecordsProps;
}): import("react").ReactElement<ReasoningRecordsProps, string | import("react").JSXElementConstructor<any>>;
export declare function installHarnessReasoningRecords(ctx: Pick<Context, 'slots'>, bindings: HarnessBindingRegistry): () => void;
export declare const reasoningRecordsStyles = "\n.cwn-reasoning-records-body{min-width:0;max-height:min(400px,50vh);overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere;scrollbar-gutter:stable}\n";
export {};
