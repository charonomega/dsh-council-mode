import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useRef, useState } from 'react';
import { useT } from "./i18n.js";
const exitDuration = 220;
// Allow the browser one frame to finish the CSS transition before removing its DOM.
const removalDelay = exitDuration + 32;
/** Scope changes must never carry a previous conversation's fading messages. */
export function FollowupQueuePresence(props) {
    return _jsx(QueuePresence, { ...props }, props.scopeKey);
}
function QueuePresence({ items, expanded, bodyId, heading, renderItem }) {
    const t = useT();
    const [rows, setRows] = useState(() => items.map((item, index) => ({ item, index, exiting: false })));
    const current = useRef(rows);
    const timers = useRef(new Map());
    const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    useLayoutEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia)
            return;
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const changed = () => setReducedMotion(query.matches);
        changed();
        query.addEventListener('change', changed);
        return () => query.removeEventListener('change', changed);
    }, []);
    useLayoutEffect(() => () => {
        for (const timer of timers.current.values())
            clearTimeout(timer);
        timers.current.clear();
    }, []);
    useLayoutEffect(() => {
        const liveIds = new Set(items.map((item) => item.id));
        for (const [id, timer] of timers.current) {
            if (liveIds.has(id) || reducedMotion) {
                clearTimeout(timer);
                timers.current.delete(id);
            }
        }
        const previous = current.current;
        const next = items.map((item, index) => ({ item, index, exiting: false }));
        if (!reducedMotion) {
            for (let index = 0; index < previous.length; index++) {
                const old = previous[index];
                if (liveIds.has(old.item.id))
                    continue;
                // Keep removed rows before their surviving successor, so unrelated rows
                // shrink into place instead of being reordered during the fade.
                const successor = previous.slice(index + 1).find((row) => liveIds.has(row.item.id));
                const position = successor ? next.findIndex((row) => row.item.id === successor.item.id) : -1;
                next.splice(position < 0 ? next.length : position, 0, { ...old, exiting: true });
                if (!timers.current.has(old.item.id)) {
                    const timer = setTimeout(() => {
                        if (timers.current.get(old.item.id) !== timer)
                            return;
                        timers.current.delete(old.item.id);
                        current.current = current.current.filter((row) => row.item.id !== old.item.id || !row.exiting);
                        setRows(current.current);
                    }, removalDelay);
                    timers.current.set(old.item.id, timer);
                }
            }
        }
        current.current = next;
        setRows(next);
    }, [items, reducedMotion]);
    if (!rows.length)
        return null;
    const exiting = items.length === 0;
    return (_jsx("div", { className: "cwn-followup-shell", "data-exiting": exiting, children: _jsx("div", { className: "cwn-followup-shell-inner", children: _jsxs("section", { className: "cwn-followup-queue", "aria-label": t('待发送消息'), "aria-live": "polite", "aria-hidden": exiting || undefined, ...(exiting ? { inert: '' } : {}), children: [_jsx("div", { className: "cwn-followup-heading", children: heading(items.length || rows.length) }), _jsx("div", { id: bodyId, className: "cwn-followup-body", "data-expanded": expanded, "aria-hidden": !expanded, ...(!expanded ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-followup-body-inner", children: _jsx("ol", { children: rows.map(({ item, index, exiting: rowExiting }) => (_jsx("li", { className: "cwn-followup-row", "data-queue-id": item.id, "data-exiting": rowExiting, "aria-hidden": rowExiting || undefined, ...(rowExiting ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-followup-row-inner", children: _jsx("div", { className: "cwn-followup-row-content", children: renderItem(item, index) }) }) }, item.id))) }) }) })] }) }) }));
}
//# sourceMappingURL=followup-queue-presence.js.map