import { type HTMLAttributes } from 'react';
import type { GuardedNativeControl } from './harness-dom-guard.ts';
type AnchorProps = Pick<HTMLAttributes<HTMLElement>, 'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onClick'> & {
    element: HTMLElement;
};
export declare function bindHarnessTooltipAnchor(element: HTMLElement, handlers: Omit<AnchorProps, 'element'>): () => void;
export declare function HarnessNativeTooltips({ targets }: {
    targets: readonly Pick<GuardedNativeControl, 'element' | 'reason'>[];
}): import("react/jsx-runtime").JSX.Element;
export {};
