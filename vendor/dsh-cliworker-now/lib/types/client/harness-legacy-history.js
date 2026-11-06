import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { ConversationTimeline } from "./conversation-timeline.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { t, useT } from "./i18n.js";
import { hostText } from "./operation-error.js";
export const harnessLegacyHistoryNotice = '原生对话从本次挂接开始；更早记录见旧历史。';
/** Reads the existing WorkerStorage Gateway only; never imports, copies or replays a turn. */
export function HarnessLegacyHistory({ api, parentSessionId, worker, items, truncated, queuedFollowups = [], }) {
    useT();
    const [opened, setOpened] = useState();
    const [page, setPage] = useState();
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const request = useRef();
    useEffect(() => () => request.current?.abort(), []);
    const close = () => {
        request.current?.abort();
        request.current = undefined;
        setOpened(undefined);
        setPage(undefined);
        setPending(false);
        setError('');
    };
    const visible = page?.items ?? opened?.items ?? [];
    const load = async (direction) => {
        if (request.current || !opened || !visible.length)
            return;
        const controller = new AbortController();
        request.current = controller;
        setPending(true);
        setError('');
        const anchor = direction === 'before' ? visible[0].id : visible.at(-1).id;
        try {
            const next = JSON.parse(value(await api.cliworker.history(parentSessionId, worker.id, anchor, direction)));
            if (next.workerId !== worker.id || !Array.isArray(next.items))
                throw new Error(t('收到不匹配的旧历史记录'));
            if (!controller.signal.aborted)
                setPage(next);
        }
        catch (cause) {
            if (!controller.signal.aborted)
                setError(operationMessage(cause));
        }
        finally {
            if (!controller.signal.aborted) {
                request.current = undefined;
                setPending(false);
            }
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("p", { children: t(harnessLegacyHistoryNotice) }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => {
                    setOpened({ items: [...items], truncated, queuedFollowups: queuedFollowups.map((item) => ({ ...item })) });
                    setPage(undefined);
                    setError('');
                }, children: t('旧历史') }), _jsxs(Modal, { open: !!opened, title: t('旧历史'), closeLabel: t('关闭旧历史'), onClose: close, className: "cwn-legacy-history-dialog", contentClassName: "cwn-legacy-history-content", children: [_jsx("p", { children: t('此处只读原 Worker 记录，不重新发送任务。页面保持本次读取时的内容。') }), !!opened?.queuedFollowups.length && (_jsxs("section", { "aria-label": t('只读旧待发消息'), children: [_jsx("p", { children: t('旧待发消息仅供核对，不会加入原生队列或自动发送。') }), _jsx("ul", { children: opened.queuedFollowups.map((item) => (_jsxs("li", { children: [_jsx("span", { children: item.state === 'paused' ? t('已暂停') : t('旧待发消息') }), _jsx("p", { style: { whiteSpace: 'pre-wrap' }, children: item.prompt }), item.pauseReason && _jsx("small", { children: hostText(item.pauseReason) })] }, item.id))) })] })), _jsxs("div", { className: "cwn-legacy-history-nav", children: [_jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: pending || !(page?.hasOlder ?? opened?.truncated) || !visible.length, onClick: () => void load('before'), children: t('更早记录') }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: pending || !page?.hasNewer || !visible.length, onClick: () => void load('after'), children: t('较新记录') }), page && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", disabled: pending, onClick: () => {
                                    setPage(undefined);
                                    setError('');
                                }, children: t('返回打开时记录') })), _jsx("span", { children: pending
                                    ? t('正在读取…')
                                    : page
                                        ? t('历史记录 {start}–{end} · 读取时共 {total} 条', { start: page.start + 1, end: page.end, total: page.total })
                                        : t('本次打开时的最近记录') })] }), error && _jsx("p", { role: "alert", children: error }), _jsx("div", { className: "cwn-legacy-history-rows", "aria-label": t('只读旧历史'), children: visible.length ? (_jsx(ConversationTimeline, { items: visible, latestItems: visible })) : (_jsx("p", { children: t('没有可显示的旧记录。') })) })] })] }));
}
//# sourceMappingURL=harness-legacy-history.js.map