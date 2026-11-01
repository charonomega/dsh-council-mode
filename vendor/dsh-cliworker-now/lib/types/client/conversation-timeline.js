import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment, useState } from 'react';
import { MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives';
import { CLI_LABELS, cliOf, active } from "../shared/types.js";
import { messageClock } from "../shared/telemetry.js";
import { UsageIndicator } from "./telemetry.js";
import { CopyText } from "./copy-text.js";
import { WorkerProcessGroup, WorkerProcessHeader, runOf, completedEmptyReply, processAlwaysOpen, processContent, } from "./worker-process.js";
import { useNativePresentation } from "./native-presentation.js";
const markdownLabels = { code: { copyLabel: '复制', copiedLabel: '已复制' }, footnotes: '脚注' };
export function ConversationTimeline({ items, latestItems = items, worker, messageFeedback, }) {
    const [expandedRuns, setExpandedRuns] = useState({});
    const policy = useNativePresentation();
    // Match rc.2 UserMessageNodeView / TurnTailNodeView. A newer user turn
    // hides the preceding assistant tail; a history page is never the live end.
    const latestUser = latestItems.findLast((item) => item.kind === 'user')?.id;
    const lastContent = latestItems.findLast((item) => ['user', 'assistant', 'tool'].includes(item.kind) && !completedEmptyReply(item, worker));
    const latestReply = lastContent?.kind === 'assistant' &&
        lastContent.text.trim() &&
        !(worker && active(worker.status) && worker.runId === runOf(lastContent))
        ? lastContent.id
        : undefined;
    const runs = new Map();
    for (const item of items) {
        const id = runOf(item);
        runs.set(id, [...(runs.get(id) ?? []), item]);
    }
    // A queued turn publishes preparation status before its native-start user event.
    // Show that opening message before its process, while preserving mid-run input order.
    const displayItems = [...items];
    for (const rows of runs.values()) {
        const opening = rows.findIndex((row) => row.kind === 'user');
        if (opening <= 0 || !rows.slice(0, opening).every((row) => ['status', 'diagnostic'].includes(row.kind)))
            continue;
        const user = rows[opening];
        displayItems.splice(displayItems.indexOf(user), 1);
        displayItems.splice(displayItems.indexOf(rows[0]), 0, user);
    }
    const flow = [];
    for (const item of displayItems) {
        const process = item.kind !== 'user' && (item.kind !== 'assistant' || completedEmptyReply(item, worker));
        const previous = flow.at(-1);
        if (process && previous?.process && runOf(previous.item) === runOf(item))
            previous.process.push(item);
        else
            flow.push({ item, process: process ? [item] : undefined });
    }
    const seen = new Set(), groupsSeen = new Set();
    return (_jsx(_Fragment, { children: flow.map(({ item, process }) => {
            const id = runOf(item);
            const rows = runs.get(id);
            const first = item.kind !== 'user' && !seen.has(id);
            if (item.kind !== 'user')
                seen.add(id);
            const firstGroup = !!process && processContent(process, worker).length > 0 && !groupsSeen.has(id);
            if (firstGroup)
                groupsSeen.add(id);
            const open = processAlwaysOpen(rows, worker) || !policy.foldCompletedTurns || !!expandedRuns[id];
            return (_jsxs(Fragment, { children: [first && (_jsx(WorkerProcessHeader, { rows: rows, worker: worker, open: open, toggle: () => setExpandedRuns((old) => ({ ...old, [id]: !open })) })), process && (_jsx(WorkerProcessGroup, { items: process, rows: rows, worker: worker, hidden: !open, first: firstGroup })), (item.kind === 'user' || (item.kind === 'assistant' && !completedEmptyReply(item, worker))) && (_jsxs("article", { className: `cwn-message ${item.kind}`, "data-message-id": item.id, "data-actions-reveal": item.kind === 'user' ? (item.id === latestUser ? 'always' : 'hover') : undefined, children: [_jsx("div", { className: item.kind === 'assistant' ? 'cwn-markdown' : 'cwn-text', children: item.kind === 'assistant' ? (_jsx(MarkdownText, { text: item.text, labels: markdownLabels })) : (item.text) }), _jsxs("div", { className: "cwn-message-tail", "data-actions-reveal": item.kind === 'assistant' ? (item.id === latestReply ? 'always' : 'hover') : undefined, children: [_jsxs("div", { className: "cwn-message-label", children: [_jsx("span", { className: "cwn-sr-only", children: item.kind === 'user' ? '你' : worker ? CLI_LABELS[cliOf(worker.preference)] : 'CLI' }), item.kind === 'assistant' && item.text && (_jsx(CopyText, { text: item.text, label: "\u590D\u5236\u56DE\u590D", iconOnly: true })), item.kind === 'assistant' && _jsx(UsageIndicator, { usage: item.usage, providerCredits: item.providerCredits, creditsBased: worker?.preference.cli === 'qoder' || worker?.preference.cli === 'qodercn', reply: true }), _jsx("time", { dateTime: item.time, title: new Date(item.time).toLocaleString('zh-CN'), children: messageClock(item.time) }), item.kind === 'user' && item.text && (_jsx(CopyText, { text: item.text, label: "\u590D\u5236\u6D88\u606F", iconOnly: true }))] }), messageFeedback?.[item.id] ??
                                        (item.kind === 'user' && item.deliveryState && item.deliveryState === 'failed' ? (_jsx("span", { role: "status", children: item.deliveryError?.includes('结果待确认')
                                                ? item.deliveryError
                                                : `发送失败：${item.deliveryError || '插队未完成'}` })) : null)] })] }))] }, item.kind === 'user' ? (item.queuedFollowupId ?? item.id) : item.id));
        }) }));
}
//# sourceMappingURL=conversation-timeline.js.map