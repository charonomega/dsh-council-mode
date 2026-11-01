import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Menu, IconChevronDownOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
export function NativeChoice({ label, selected, choices, disabled, onChange, placeholder, describedBy, }) {
    const [open, setOpen] = useState(false);
    const anchor = useRef(null);
    const [anchorWidth, setAnchorWidth] = useState();
    const menuClass = `cwn-settings-choice-menu-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    useEffect(() => {
        if (disabled)
            setOpen(false);
    }, [disabled]);
    useEffect(() => {
        const button = anchor.current;
        if (!open || !button)
            return;
        const measure = () => {
            const width = button.getBoundingClientRect().width;
            if (width > 0)
                setAnchorWidth(width);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(button);
        return () => observer.disconnect();
    }, [open]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: anchorWidth === undefined ? '' : `.${menuClass}{--cwn-settings-choice-width:${anchorWidth}px}` }), _jsx(Menu, { open: open && !disabled, onClose: () => setOpen(false), portal: true, align: "start", className: "cwn-settings-choice", listClassName: `cwn-settings-choice-menu ${menuClass}`, selectedId: selected, items: choices, onSelect: (id) => {
                    if (!choices.some((choice) => choice.id === id && !choice.disabled))
                        return;
                    onChange(id);
                    setOpen(false);
                }, anchor: _jsxs(Button, { ref: anchor, type: "button", variant: "outline", size: "md", "aria-label": label, "aria-describedby": describedBy, "aria-haspopup": "menu", "aria-expanded": open && !disabled, disabled: disabled, onClick: () => {
                        if (!open) {
                            const width = anchor.current?.getBoundingClientRect().width;
                            if (width && width > 0)
                                setAnchorWidth(width);
                        }
                        setOpen((old) => !old);
                    }, children: [_jsx("span", { children: choices.find((choice) => choice.id === selected)?.label ??
                                placeholder ??
                                (label === '默认思考强度' ? '选择强度' : '选择模型') }), _jsx(IconChevronDownOutlineRegular, { size: 14 })] }) })] }));
}
//# sourceMappingURL=native-settings-choice.js.map