import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Glyph } from "./icons.js";
import { Button, Tooltip, IconCheckOutlineRegular, writeClipboard, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "./i18n.js";
export function CopyText({ text, label, iconOnly = false, }) {
    const t = useT();
    const [feedback, setFeedback] = useState('');
    const [busy, setBusy] = useState(false);
    const timer = useRef();
    const current = useRef(text), alive = useRef(true);
    current.current = text;
    useEffect(() => {
        setFeedback('');
    }, [text]);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            clearTimeout(timer.current);
        };
    }, []);
    return (_jsxs("span", { className: "cwn-copy", children: [_jsx(Tooltip, { label: feedback ? t(feedback) : label, side: "bottom", portal: true, children: _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": label, className: iconOnly ? 'cwn-copy-icon' : undefined, disabled: busy || !text, onClick: () => {
                        const source = text;
                        setBusy(true);
                        void (async () => {
                            let copied = false;
                            try {
                                copied = await writeClipboard(source);
                            }
                            catch {
                                /* The visible failure state offers manual copy. */
                            }
                            if (!alive.current)
                                return;
                            setBusy(false);
                            if (current.current === source) {
                                setFeedback(copied ? '已复制' : '复制失败，请选择文本手动复制');
                                if (copied) {
                                    clearTimeout(timer.current);
                                    timer.current = setTimeout(() => setFeedback(''), 1000);
                                }
                            }
                        })();
                    }, children: iconOnly ? (feedback === '已复制' ? (_jsx(IconCheckOutlineRegular, { size: 16 })) : (_jsx(Glyph, { name: "copy" }))) : feedback === '已复制' ? (t('已复制')) : (label) }) }), feedback && (_jsx("span", { role: "status", className: feedback === '已复制' ? 'cwn-sr-only' : 'cwn-copy-feedback', children: t(feedback) }))] }));
}
//# sourceMappingURL=copy-text.js.map