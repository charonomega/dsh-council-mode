import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
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
        const listener = (event) => {
            if ((eventName === 'mouseover' || eventName === 'mouseout') &&
                event.relatedTarget &&
                element.contains(event.relatedTarget))
                return;
            if (eventName === 'mouseover' || eventName === 'mouseout')
                event.stopPropagation();
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
export function HarnessNativeTooltips({ targets }) {
    return (_jsx(_Fragment, { children: targets.map(({ element, reason }, index) => (_jsx(Tooltip, { label: reason, side: "top", portal: true, children: _jsx(ExistingNativeAnchor, { element: element }) }, index))) }));
}
//# sourceMappingURL=harness-native-tooltip.js.map