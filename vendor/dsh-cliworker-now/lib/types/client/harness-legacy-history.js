import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { ConversationTimeline } from "./conversation-timeline.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
export const harnessLegacyHistoryNotice = '原生对话从本次挂接开始；更早记录见旧历史。';
/** Reads the existing WorkerStorage Gateway only; never imports, copies or replays a turn. */
export function HarnessLegacyHistory({ api, parentSessionId, worker, items, truncated, queuedFollowups = [], }) {
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
                throw new Error('收到不匹配的旧历史记录');
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
    return (_jsxs(_Fragment, { children: [_jsx("p", { children: harnessLegacyHistoryNotice }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => {
                    setOpened({ items: [...items], truncated, queuedFollowups: queuedFollowups.map((item) => ({ ...item })) });
                    setPage(undefined);
                    setError('');
                }, children: "\u65E7\u5386\u53F2" }), _jsxs(Modal, { open: !!opened, title: "\u65E7\u5386\u53F2", closeLabel: "\u5173\u95ED\u65E7\u5386\u53F2", onClose: close, className: "cwn-legacy-history-dialog", contentClassName: "cwn-legacy-history-content", children: [_jsx("p", { children: "\u6B64\u5904\u53EA\u8BFB\u539F Worker \u8BB0\u5F55\uFF0C\u4E0D\u91CD\u65B0\u53D1\u9001\u4EFB\u52A1\u3002\u9875\u9762\u4FDD\u6301\u672C\u6B21\u8BFB\u53D6\u65F6\u7684\u5185\u5BB9\u3002" }), !!opened?.queuedFollowups.length && (_jsxs("section", { "aria-label": "\u53EA\u8BFB\u65E7\u5F85\u53D1\u6D88\u606F", children: [_jsx("p", { children: "\u65E7\u5F85\u53D1\u6D88\u606F\u4EC5\u4F9B\u6838\u5BF9\uFF0C\u4E0D\u4F1A\u52A0\u5165\u539F\u751F\u961F\u5217\u6216\u81EA\u52A8\u53D1\u9001\u3002" }), _jsx("ul", { children: opened.queuedFollowups.map((item) => (_jsxs("li", { children: [_jsx("span", { children: item.state === 'paused' ? '已暂停' : '旧待发消息' }), _jsx("p", { style: { whiteSpace: 'pre-wrap' }, children: item.prompt }), item.pauseReason && _jsx("small", { children: item.pauseReason })] }, item.id))) })] })), _jsxs("div", { className: "cwn-legacy-history-nav", children: [_jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: pending || !(page?.hasOlder ?? opened?.truncated) || !visible.length, onClick: () => void load('before'), children: "\u66F4\u65E9\u8BB0\u5F55" }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: pending || !page?.hasNewer || !visible.length, onClick: () => void load('after'), children: "\u8F83\u65B0\u8BB0\u5F55" }), page && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", disabled: pending, onClick: () => {
                                    setPage(undefined);
                                    setError('');
                                }, children: "\u8FD4\u56DE\u6253\u5F00\u65F6\u8BB0\u5F55" })), _jsx("span", { children: pending
                                    ? '正在读取…'
                                    : page
                                        ? `历史记录 ${page.start + 1}–${page.end} · 读取时共 ${page.total} 条`
                                        : '本次打开时的最近记录' })] }), error && _jsx("p", { role: "alert", children: error }), _jsx("div", { className: "cwn-legacy-history-rows", "aria-label": "\u53EA\u8BFB\u65E7\u5386\u53F2", children: visible.length ? (_jsx(ConversationTimeline, { items: visible, latestItems: visible })) : (_jsx("p", { children: "\u6CA1\u6709\u53EF\u663E\u793A\u7684\u65E7\u8BB0\u5F55\u3002" })) })] })] }));
}
//# sourceMappingURL=harness-legacy-history.js.map