import { type HTMLAttributes, type ReactNode } from 'react';
import type { GuardedNativeControl } from './harness-dom-guard.ts';
type AnchorProps = Pick<HTMLAttributes<HTMLElement>, 'onMouseEnter' | 'onMouseLeave' | 'onFocus' | 'onBlur' | 'onClick'> & {
    element: HTMLElement;
};
export declare function bindHarnessTooltipAnchor(element: HTMLElement, handlers: Omit<AnchorProps, 'element'>): () => void;
export declare function HarnessNativeTooltips({ targets, }: {
    targets: readonly Pick<GuardedNativeControl, 'element' | 'reason' | 'feature'>[];
}): import("react/jsx-runtime").JSX.Element;
/**
 * Explain why a wrapped native control is unavailable. The control's own browser
 * `title` would show as a second tooltip, so it is removed while the reason shows;
 * the control remounts without this wrapper once the reason clears.
 */
export declare function HarnessReasonTooltip({ label, side, children, }: {
    label: string;
    side: 'top' | 'bottom';
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export {};
