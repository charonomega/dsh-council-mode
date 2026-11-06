import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { createContext, createElement, useContext, useEffect, useLayoutEffect, useRef, useState, } from 'react';
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { retainHarnessComposerBlock } from "./harness-conversation.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { t, useT } from "./i18n.js";
import { Glyph } from "./icons.js";
import { NameCopy } from "./name-copy.js";
const labels = {
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    unknown: '状态未知',
};
export const DshConversationContext = createContext(undefined);
export function useDshConversation(sessionId) {
    const context = useContext(DshConversationContext);
    return context?.child.id === sessionId ? context : undefined;
}
export function DshSubagentCard({ child, collapsed, onOpen, onHide, busy, }) {
    useT();
    const [menu, setMenu] = useState(false);
    const point = useRef();
    const card = useRef(null);
    const openButton = useRef(null);
    useEffect(() => {
        if (collapsed)
            setMenu(false);
    }, [collapsed]);
    const visualStatus = child.stopped ? 'interrupted' : child.status;
    const external = child.mode === 'external';
    const open = () => {
        if (!collapsed && !external)
            onOpen();
    };
    const openMenu = (x, y) => {
        if (collapsed)
            return;
        point.current = x === undefined || y === undefined ? undefined : { x, y };
        setMenu(true);
    };
    // Same card grammar as CLI Workers. The title is DSH-owned, so only "delete"
    // (hide from this window) is offered; the native child and records remain.
    const entries = [
        { id: 'open', label: t('打开对话'), disabled: collapsed || external },
        { type: 'separator', id: 'separator' },
        { type: 'label', id: 'delete-scope', text: t('仅在此窗口隐藏，不影响 DSH 原生会话与记录') },
        { id: 'delete', label: t('删除'), disabled: collapsed || busy, danger: true },
    ];
    return (_jsx("div", { ref: card, className: "cwn-worker", "data-dsh-child-id": child.id, title: external ? t('此外部 DSH 子 Agent 没有可打开的本地会话') : undefined, onClick: (event) => {
            if (event.target.closest?.('button,[role="menu"]'))
                return;
            open();
        }, onContextMenu: (event) => {
            if (collapsed)
                return;
            event.preventDefault();
            event.stopPropagation();
            openMenu(event.clientX, event.clientY);
        }, children: _jsx(Menu, { open: menu, portal: true, autoFocus: true, className: "cwn-worker-menu-anchor", listClassName: "cwn-worker-menu", getAnchorRect: () => {
                if (point.current)
                    return new DOMRect(point.current.x, point.current.y, 0, 0);
                return card.current?.getBoundingClientRect() ?? openButton.current?.getBoundingClientRect() ?? null;
            }, onClose: () => setMenu(false), items: entries, onSelect: (id) => {
                setMenu(false);
                if (id === 'open')
                    open();
                else if (id === 'delete')
                    onHide();
            }, anchor: _jsxs("div", { className: "cwn-worker-layout", children: [_jsx("button", { ref: openButton, type: "button", className: "cwn-worker-open", tabIndex: collapsed ? -1 : undefined, "data-open-worker-id": child.id, "aria-haspopup": "menu", "aria-expanded": menu, "aria-keyshortcuts": "Shift+F10", disabled: collapsed || external, onClick: open, onKeyDown: (event) => {
                            if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
                                if (collapsed)
                                    return;
                                event.preventDefault();
                                event.stopPropagation();
                                openMenu();
                            }
                        }, children: _jsxs("span", { className: "cwn-worker-line", children: [_jsx("span", { className: "cwn-worker-title", children: child.name }), _jsxs("span", { className: `cwn-worker-status ${visualStatus}`, children: [_jsx("span", { className: `cwn-dot ${visualStatus}` }), t(child.stopped ? '已停止' : labels[child.status])] })] }) }), _jsxs("div", { className: "cwn-worker-meta", children: [_jsx(NameCopy, { name: child.agentName, disabled: collapsed }), child.model && _jsxs(_Fragment, { children: [_jsx("span", { className: "cwn-meta-divider cwn-name-divider", "aria-hidden": "true" }), _jsx("span", { className: "cwn-worker-model", title: child.model, children: child.model })] })] }), !external && _jsx("span", { className: "cwn-worker-chevron", "aria-hidden": "true", children: _jsx(Glyph, { name: "chevron" }) })] }) }) }));
}
/** Keep the exact native InputBar (including stats, queue, draft and keyboard).
 * Native Session.prompt already routes to DSH subagents.prompt. Only stop's
 * public action is replaced, so its receipt waits for confirmed settlement. */
export function DshNativeComposer({ Native, nativeProps, context, }) {
    useT();
    const { child, api } = context;
    const request = useRef();
    const [error, setError] = useState('');
    const [stopping, setStopping] = useState(false);
    useEffect(() => () => request.current?.abort(), [child.id]);
    const readonly = child.mode !== 'continuable';
    const stop = async () => {
        if (readonly || request.current)
            return;
        const controller = new AbortController();
        request.current = controller;
        setError('');
        setStopping(true);
        try {
            if (!api.cliworker.stopDshSubagent)
                throw new Error(t('DSH 停止尚未确认，请重试'));
            const receipt = JSON.parse(value(await api.cliworker.stopDshSubagent(child.parentSessionId, child.id, controller.signal)));
            if (receipt.stopped !== true)
                throw new Error(t('DSH 停止尚未确认，请重试'));
        }
        catch (error) {
            if (!controller.signal.aborted)
                setError(operationMessage(error));
        }
        finally {
            if (request.current === controller)
                request.current = undefined;
            if (!controller.signal.aborted)
                setStopping(false);
        }
    };
    return (_jsxs(_Fragment, { children: [createElement(Native, {
                ...nativeProps,
                ...(readonly ? { blocked: { reason: t('此 DSH 子 Agent 只读') } } : {}),
                stop: readonly || !api.cliworker.stopDshSubagent
                    ? undefined
                    : () => {
                        void stop();
                    },
            }), stopping && (_jsx("p", { className: "cwn-notice", role: "status", children: t('正在停止') })), error && (_jsx("p", { className: "cwn-error", role: "alert", children: error }))] }));
}
/** Same native child content/SessionProvider as Workers, without CLI bindings
 * or synthetic telemetry. All records and statistics remain native projections. */
export function DshConversation({ services, child, api, renderConversation, }) {
    useT();
    const key = `${child.parentSessionId}:${child.id}:${child.mode}`;
    const [state, setState] = useState({ key });
    useLayoutEffect(() => retainHarnessComposerBlock(services.conversation, child.id, child.mode !== 'continuable' ? t('此 DSH 子 Agent 只读') : undefined), [services.conversation, child.id, child.mode, t]);
    useEffect(() => {
        const controller = new AbortController();
        let reference, unsubscribe;
        setState({ key });
        try {
            if (child.mode === 'external')
                throw new Error(t('无法打开原生会话'));
            reference = services.sessions.retain({
                parentSessionId: child.parentSessionId,
                childSessionId: child.id,
                mode: child.mode,
            }, { source: 'cliworkerConversation', signal: controller.signal });
            const retained = reference;
            void retained.ready
                .then((binding) => {
                if (controller.signal.aborted)
                    return;
                if (binding.sessionId !== child.id || retained.sessionId !== child.id)
                    throw new Error(t('原生会话身份或能力与当前子 Agent 不一致'));
                const publish = () => {
                    if (controller.signal.aborted)
                        return;
                    const snapshot = binding.session.getSnapshot();
                    setState({
                        key,
                        reference: retained,
                        error: snapshot.openState === 'error'
                            ? snapshot.openError?.message || t('原生会话历史读取失败。')
                            : undefined,
                    });
                };
                unsubscribe = binding.session.subscribe(publish);
                publish();
            })
                .catch((error) => {
                if (!controller.signal.aborted)
                    setState({ key, error: operationMessage(error) });
            });
        }
        catch (error) {
            setState({ key, error: operationMessage(error) });
        }
        return () => {
            controller.abort();
            unsubscribe?.();
            reference?.release();
        };
    }, [services.sessions, key]);
    const current = state.key === key ? state : undefined;
    return (_jsx(DshConversationContext.Provider, { value: { child, api }, children: _jsx("div", { className: "cwn-harness-conversation", "data-dsh-conversation": child.id, "aria-label": t('DSH 原生子会话'), children: current?.error ? (_jsx("p", { role: "alert", className: "cwn-error", children: current.error })) : current?.reference ? (renderConversation(current.reference)) : (_jsx("p", { role: "status", className: "cwn-notice", children: t('正在打开原生子会话…') })) }) }));
}
//# sourceMappingURL=dsh-subagents.js.map