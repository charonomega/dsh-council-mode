import type { HarnessConversationBinding } from '../shared/types.ts';
type GuardedFeature = 'fork' | 'attachments';
/** Marks a native button whose own adjacent tooltip bubble is hidden while the plugin's reason shows. */
export declare const HARNESS_REASON_TOOLTIP = "data-cwn-reason-tooltip";
export interface GuardedNativeControl {
    element: HTMLButtonElement;
    feature: GuardedFeature;
    reason: string;
}
export interface HarnessDomForkActions {
    reason(button: HTMLButtonElement): string | undefined;
    fork(button: HTMLButtonElement): void;
}
/** Guard only one verified CLI child occurrence, never another Session or body portals. */
export declare function installHarnessDomGuard(root: HTMLElement, binding: HarnessConversationBinding, onTargets?: (targets: readonly GuardedNativeControl[]) => void, forks?: HarnessDomForkActions): () => void;
/** Locate native occurrences by their exact public Session identity, including the main frame. */
export declare function installHarnessSessionDomGuard(document: Document, binding: HarnessConversationBinding, onTargets: (targets: readonly GuardedNativeControl[]) => void, forks?: HarnessDomForkActions): () => void;
export {};
