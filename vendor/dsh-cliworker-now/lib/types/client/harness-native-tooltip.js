import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
export function bindHarnessTooltipAnchor(element, handlers) {
    const bindings = [
        ['mouseover', handlers.onMouseEnter],
        ['mouseout', handlers.onMouseLeave],
        ['focus', handlers.onFocus],
        ['blur', handlers.onBlur],
        ['click', handlers.onClick],
    ];
    const removers = bindings.flatMap(([eventName, handler]) => {
        if (!handler)
            return [];
        // Events keep propagating: React derives the native tooltip's enter from the
        // previous element's mouseout, so stopping them here never hid it and only
        // left its leave undelivered. The native bubble is hidden by style instead.
        const listener = (event) => {
            if ((eventName === 'mouseover' || eventName === 'mouseout') &&
                event.relatedTarget &&
                element.contains(event.relatedTarget))
                return;
            handler(event);
        };
        element.addEventListener(eventName, listener, true);
        return [() => element.removeEventListener(eventName, listener, true)];
    });
    return () => {
        for (const remove of removers)
            remove();
    };
}
/** Bind the public Tooltip primitive to an existing native element without moving or rendering it. */
const ExistingNativeAnchor = forwardRef(function ExistingNativeAnchor({ element, ...handlers }, ref) {
    useImperativeHandle(ref, () => element, [element]);
    useLayoutEffect(() => bindHarnessTooltipAnchor(element, handlers), [
        element,
        handlers.onMouseEnter,
        handlers.onMouseLeave,
        handlers.onFocus,
        handlers.onBlur,
        handlers.onClick,
    ]);
    return null;
});
/** The side each native control's own tooltip uses, so the reason appears where the user expects it. */
const NATIVE_SIDE = { fork: 'bottom', attachments: 'top' };
export function HarnessNativeTooltips({ targets, }) {
    return (_jsx(_Fragment, { children: targets.map(({ element, reason, feature }, index) => (_jsx(Tooltip, { label: reason, side: NATIVE_SIDE[feature], portal: true, children: _jsx(ExistingNativeAnchor, { element: element }) }, index))) }));
}
/**
 * Explain why a wrapped native control is unavailable. The control's own browser
 * `title` would show as a second tooltip, so it is removed while the reason shows;
 * the control remounts without this wrapper once the reason clears.
 */
export function HarnessReasonTooltip({ label, side, children, }) {
    const anchor = useRef(null);
    useLayoutEffect(() => {
        const element = anchor.current;
        if (!element)
            return;
        const strip = () => {
            for (const node of element.querySelectorAll('[title]'))
                node.removeAttribute('title');
        };
        strip();
        const Observer = element.ownerDocument.defaultView?.MutationObserver;
        const observer = Observer ? new Observer(strip) : undefined;
        observer?.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
        return () => observer?.disconnect();
    }, []);
    return (_jsx(Tooltip, { label: label, side: side, portal: true, children: _jsx("span", { ref: anchor, tabIndex: 0, "aria-label": label, children: children }) }));
}
//# sourceMappingURL=harness-native-tooltip.js.map