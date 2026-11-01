import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip, useAnchoredPosition, useDismissOnOutsidePointer, } from '@deepseek-ai/dsh-client-ui-primitives';
/** Same positioning/dismissal primitives and geometry as Harness useStatDialog. */
export function StatPopover({ label, tooltip, context = false, className = '', trigger, children, }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null), panelRef = useRef(null);
    const position = useAnchoredPosition({
        open,
        anchorRef: rootRef,
        panelRef,
        side: 'top',
        gap: 8,
        margin: 12,
    });
    useDismissOnOutsidePointer(rootRef, open, setOpen, panelRef);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (event) => {
            if (event.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);
    const button = (_jsx("button", { type: "button", className: className, "aria-label": label, "aria-haspopup": "dialog", "aria-expanded": open, onClick: () => setOpen(!open), children: trigger }));
    return (_jsxs("span", { ref: rootRef, className: "cwn-stat-anchor", children: [tooltip ? (_jsx(Tooltip, { label: tooltip, side: "top", delayMs: 200, disabled: open, portal: true, children: button })) : (button), open &&
                createPortal(_jsx("div", { ref: panelRef, role: "dialog", "aria-label": label, className: `cwn-stat-panel${context ? ' cwn-context-panel' : ''}`, style: position ?? { visibility: 'hidden', left: 0, top: 0 }, children: children }), document.body)] }));
}
//# sourceMappingURL=stat-popover.js.map