import { jsx as _jsx } from "react/jsx-runtime";
import { createElement, useMemo } from 'react';
import { CLI_IDS } from "../shared/types.js";
import { useHarnessSessionBinding } from "./harness-binding-registry.js";
import { useT } from "./i18n.js";
/** The native ReasoningRow stays INSIDE its Turn process and in tool-step order.
 * Only its label and expanded body's scrolling change. Native public blocks own
 * content, streaming previews, disclosure/reset state and historical persistence.
 */
export function HarnessReasoningRecords({ Native, bindings, props }) {
    const binding = useHarnessSessionBinding(bindings, props.sessionId);
    const address = props.useSession(session => session.subagent?.address);
    const cli = binding?.cliSelection?.cli;
    const enabled = !!binding?.workerId && binding.mode === 'continuable'
        && !!cli && CLI_IDS.some(id => id === cli)
        && binding.sessionId === props.sessionId && binding.parentSessionId !== props.sessionId
        && address?.childSessionId === binding.sessionId && address.parentSessionId === binding.parentSessionId;
    const own = useT();
    const t = useMemo(() => (key, ...args) => key === 'message.think' ? own('思考记录') : props.t(key, ...args), [props.t, own]);
    const renderSlot = useMemo(() => (name, owner, ...args) => {
        const content = props.renderSlot(name, owner, ...args);
        return name === 'conversation.chat.reasoning.body'
            ? _jsx("div", { className: "cwn-reasoning-records-body", "data-reasoning-records": true, role: "region", "aria-label": own('思考记录'), children: content })
            : content;
    }, [props.renderSlot]);
    return createElement(Native, enabled ? { ...props, t, renderSlot } : props);
}
export function installHarnessReasoningRecords(ctx, bindings) {
    const name = 'conversation.chat.node';
    return ctx.slots.inject(name, () => {
        let original, own, release;
        let updating = false, disposed = false;
        const sync = () => {
            if (updating || disposed)
                return;
            const next = ctx.slots.entries(name).find(entry => entry !== own && entry.options.key === 'assistant-step');
            if (next === original)
                return;
            updating = true;
            try {
                release?.();
                release = undefined;
                own = undefined;
                original = next;
                if (!next)
                    return;
                const Native = next.component;
                const Bound = (props) => _jsx(HarnessReasoningRecords, { Native: Native, props: props, bindings: bindings });
                const unregister = ctx.slots.register({
                    name, key: 'assistant-step', priority: (next.options.priority ?? 0) - 1,
                    ...(next.inject && { inject: next.inject }), ...(next.locale && { locale: next.locale }),
                    ...(next.store && { store: next.store }), ...(next.select && { select: next.select }),
                }, Bound);
                own = ctx.slots.entries(name).find(entry => entry.component === Bound);
                // Borrow the native render kit; its original entry alone owns the child
                // declarations. Dropping borrowed metadata before disposal preserves them.
                const shadow = own;
                if (shadow && next.children)
                    shadow.children = next.children;
                release = () => {
                    if (shadow && shadow.children === next.children)
                        delete shadow.children;
                    unregister();
                };
            }
            finally {
                updating = false;
            }
        };
        const unsubscribe = ctx.slots.subscribe(name, sync);
        const dispose = () => {
            if (disposed)
                return;
            disposed = true;
            unsubscribe();
            release?.();
        };
        try {
            sync();
        }
        catch (error) {
            dispose();
            throw error;
        }
        return dispose;
    });
}
export const reasoningRecordsStyles = `
.cwn-reasoning-records-body{min-width:0;max-height:min(400px,50vh);overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere;scrollbar-gutter:stable}
`;
//# sourceMappingURL=harness-reasoning-records.js.map