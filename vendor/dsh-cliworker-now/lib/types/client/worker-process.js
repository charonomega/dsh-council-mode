import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useState } from 'react';
import { DisclosureRow, DiffBlock, IconChevronDownOutlineRegular, IconChevronUpOutlineRegular, IconThinkOutlineRegular, IconFlatListOutlineRegular, IconCodeOutlineRegular, JsonTree, MarkdownText, StateDot, TerminalBlock, TextShimmer, } from '@deepseek-ai/dsh-client-ui-primitives';
import { active, isUserInterrupted } from "../shared/types.js";
import { messageClock } from "../shared/telemetry.js";
import { UsageIndicator } from "./telemetry.js";
import { useNativePresentation } from "./native-presentation.js";
import { nativeFileDiffs } from "./tool-viewers.js";
export const runOf = (item) => item.admittedRunId ?? item.id.split(':')[0];
export const completedEmptyReply = (item, worker) => item.kind === 'assistant' &&
    !item.text.trim() &&
    (item.state === 'DONE' ||
        !!item.runEndedAt ||
        (!!item.runOutcome && !active(item.runOutcome)) ||
        (worker?.runId === runOf(item) && !active(worker.status)));
const markdownLabels = { code: { copyLabel: '复制', copiedLabel: '已复制' }, footnotes: '脚注' };
const jsonLabels = {
    copyValue: '复制值',
    copyJson: '复制 JSON',
    copyPath: '复制路径',
    copyPrettyJson: '复制格式化 JSON',
    copyCompactJson: '复制紧凑 JSON',
    copied: '已复制',
    copyFailed: '复制失败',
    collapseNode: '收起',
    expandNode: '展开',
    copyButtonTitle: (action) => action,
};
const terminalLabels = {
    commandLine: (line) => `命令第 ${line} 行`,
    signal: (signal) => `信号 ${signal}`,
    exitCode: (code) => `退出码 ${code}`,
    noExitCode: '未提供退出码',
    running: '运行中',
    failed: '失败',
    done: '已完成',
    copy: '复制',
    copied: '已复制',
    noOutput: '没有输出',
    collapseAria: '收起输出',
    collapse: '收起',
    expandAria: (n) => `展开 ${n} 行输出`,
    expand: (n) => `展开 ${n} 行`,
};
export function processClosed(rows, worker) {
    return (!!rows.some((row) => row.runEndedAt || (row.runOutcome && !active(row.runOutcome))) ||
        !worker ||
        worker.runId !== runOf(rows[0]) ||
        !active(worker.status));
}
export function processAlwaysOpen(rows, worker) {
    return (!processClosed(rows, worker) ||
        rows.filter((row) => row.kind === 'user').length > 1 ||
        rows.some((row) => ['failed', 'interrupted', 'uncertain'].includes(row.runOutcome ?? '')) ||
        (worker?.runId === runOf(rows[0]) && ['failed', 'interrupted', 'uncertain'].includes(worker.status)));
}
const normalStatus = new Set([
    'queued',
    'running',
    'stopping',
    'completed',
    'interrupted',
    '已停止',
    'CLI 已连接',
]);
export function processContent(rows, worker) {
    return rows.filter((row) => row.kind === 'reasoning'
        ? !!row.detail?.trim()
        : row.kind === 'assistant'
            ? completedEmptyReply(row, worker)
            : row.kind === 'tool' ||
                (row.kind === 'diagnostic' && (!normalStatus.has(row.text) || !!row.detail?.trim())));
}
/** Native rc.2 TurnProcessNodeView geometry; only recorded boundaries supply elapsed time. */
export function WorkerProcessHeader({ rows, worker, open, toggle, }) {
    const policy = useNativePresentation();
    if (!processClosed(rows, worker))
        return null;
    const first = rows[0], outcome = rows.find((row) => row.runOutcome)?.runOutcome ??
        (worker?.runId === runOf(first) ? worker.status : undefined);
    const stopped = outcome === 'interrupted' ||
        (worker?.runId === runOf(first) && isUserInterrupted(worker)) ||
        rows.some((row) => row.text === '已停止');
    const failed = outcome === 'failed' || outcome === 'uncertain';
    const start = Date.parse(rows.find((row) => row.runStartedAt)?.runStartedAt ?? ''), end = Date.parse(rows.find((row) => row.runEndedAt)?.runEndedAt ?? '');
    const seconds = Number.isFinite(start) && Number.isFinite(end) ? Math.max(1, Math.floor((end - start) / 1000)) : undefined;
    const duration = seconds === undefined
        ? ''
        : seconds < 60
            ? `，用时 ${seconds}秒`
            : `，用时 ${Math.floor(seconds / 60)}分 ${seconds % 60}秒`;
    const label = stopped ? '已停止' : failed ? '失败' : `已完成${duration}`;
    const foldable = policy.foldCompletedTurns && !processAlwaysOpen(rows, worker) && processContent(rows, worker).length > 0;
    return (_jsxs("div", { className: "cwn-progress", "data-process-run": runOf(first), children: [_jsx("span", { className: "cwn-sr-only", role: "status", children: stopped ? '已停止' : failed ? '失败' : '已完成' }), _jsxs("button", { type: "button", className: "cwn-process-control", disabled: !foldable, "aria-expanded": foldable ? open : undefined, "data-open": open || undefined, onClick: (event) => {
                    event.currentTarget.focus();
                    toggle();
                }, children: [_jsx("span", { children: label }), foldable && _jsx(IconChevronDownOutlineRegular, { size: 14 })] })] }));
}
function rowState(item) {
    const state = (item.state ?? '').toLowerCase();
    if (['completed', 'done', 'success', 'succeeded'].includes(state))
        return { state: 'done', label: '已完成', running: false };
    if (['error', 'failed', 'failure'].includes(state))
        return { state: 'error', label: '失败', running: false };
    if (item.runStatus || (item.runEndedAt && ['running', 'pending', 'in_progress', 'started'].includes(state)))
        return { state: 'warning', label: '未收到最终状态', running: false };
    if (['stopped', 'interrupted', 'cancelled', 'canceled'].includes(state))
        return { state: 'warning', label: '已停止', running: false };
    if (['running', 'pending', 'in_progress', 'started'].includes(state))
        return { state: 'ongoing', label: '进行中', running: true };
    return { state: 'idle', label: '状态未提供', running: false };
}
function reasoningSummary(text, running) {
    if (!running)
        return text.split(/\r?\n/, 1)[0].replaceAll('**', '');
    let summary = '';
    for (const paragraph of text.split(/\r?\n[\t ]*\r?\n/)) {
        const newline = paragraph.indexOf('\n');
        if (newline >= 0 && paragraph.slice(0, newline).trim())
            summary = paragraph.slice(0, newline).trim();
    }
    return summary.replaceAll('**', '');
}
function Reasoning({ item }) {
    const [open, setOpen] = useState(false), policy = useNativePresentation(), observed = rowState(item);
    const text = item.detail ?? '', summary = reasoningSummary(text, observed.running);
    return (_jsx("div", { className: "cwn-reasoning-row", title: item.text, "data-state": observed.state, "data-expanded": open || undefined, children: _jsx(DisclosureRow, { icon: _jsx(IconThinkOutlineRegular, { size: 14 }), title: "\u601D\u8003", open: open, expandable: true, expandOnRowClick: true, running: observed.running, onToggle: () => setOpen(!open), collapsedContent: (observed.running || policy.settledReasoningPreview) && summary ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "cwn-process-separator" }), _jsx("span", { className: "cwn-reasoning-summary", children: _jsx(TextShimmer, { active: observed.running, children: summary }) })] })) : undefined, children: open && (_jsx("div", { className: "cwn-reasoning-body", children: _jsx(MarkdownText, { text: text, streaming: observed.running, labels: markdownLabels, variant: "compact" }) })) }) }));
}
function Value({ value, label }) {
    if (value !== null && typeof value === 'object')
        return _jsx(JsonTree, { data: value, label: label, labels: jsonLabels, expandTopLevel: true, copyable: true });
    return _jsx("pre", { className: "cwn-tool-raw", children: typeof value === 'string' ? value : JSON.stringify(value) });
}
function detailValue(detail) {
    try {
        return JSON.parse(detail);
    }
    catch {
        return detail;
    }
}
/** Validate only explicit identity links. Rendering order never follows a guessed name or timestamp. */
export function toolDepth(item, rows) {
    const call = item.toolCall;
    if (!call?.callId || !call.parentCallId)
        return { depth: 0, unresolved: false };
    const byId = new Map(rows
        .filter((row) => row.kind === 'tool' && row.toolCall?.callId)
        .map((row) => [row.toolCall.callId, row]));
    const seen = new Set([call.callId]);
    let parent = call.parentCallId, depth = 0;
    while (parent) {
        if (seen.has(parent) || depth >= 16)
            return { depth: 0, unresolved: true };
        seen.add(parent);
        const found = byId.get(parent);
        if (!found)
            return { depth: 0, unresolved: true };
        depth++;
        parent = found.toolCall?.parentCallId ?? '';
    }
    return { depth, unresolved: false };
}
function Tool({ item, rows, worker }) {
    const [open, setOpen] = useState(false), call = item.toolCall, observed = rowState(item), chain = toolDepth(item, rows);
    const hasInput = call?.input !== undefined, hasOutput = call?.output !== undefined;
    const expandable = hasInput || hasOutput || !!call?.command || !!item.detail;
    const title = call?.name || item.text;
    const summary = call?.command ??
        (hasInput ? (typeof call.input === 'string' ? call.input : JSON.stringify(call.input)) : '');
    const terminal = typeof call?.command === 'string';
    const diffs = nativeFileDiffs(call);
    return (_jsx("div", { className: `cwn-process-tool${chain.depth ? ' cwn-tool-child' : ''}`, "data-tool-call-id": call?.callId, "data-parent-tool-call-id": call?.parentCallId, "data-state": observed.state, style: chain.depth ? { marginLeft: `${chain.depth * 22}px` } : undefined, title: chain.unresolved ? '父调用未在当前记录内或关系无法核对' : undefined, children: _jsx(DisclosureRow, { icon: _jsx(StateDot, { state: observed.state, size: 14 }), title: title, open: open, expandable: expandable, expandOnRowClick: true, previewChevron: true, running: observed.running, onToggle: () => setOpen(!open), collapsedContent: _jsxs(_Fragment, { children: [_jsx("span", { className: "cwn-process-separator" }), _jsx("span", { className: "cwn-tool-summary", children: summary || observed.label })] }), children: open && (_jsxs("div", { className: "cwn-tool-body", children: [terminal ? (_jsx(TerminalBlock, { command: call.command, cwd: worker?.project, output: typeof call.output === 'string' ? call.output : undefined, exitCode: call.exitCode, running: observed.running, runStateDot: false, labels: terminalLabels })) : null, !terminal && hasInput && (_jsxs("section", { className: "cwn-tool-io", children: [_jsx("span", { children: "\u53C2\u6570" }), _jsx(Value, { value: call.input, label: `${title} 参数` })] })), diffs && (_jsxs("section", { className: "cwn-tool-diff", children: [_jsx("p", { className: "cwn-process-note", children: "CLI \u63D0\u4F9B\u7684\u5C40\u90E8\u8865\u4E01\uFF0C\u975E\u6587\u4EF6\u5B8C\u6574\u5185\u5BB9\u3002" }), _jsx(DiffBlock, { diffs: diffs, labels: {
                                    codeLabel: '代码',
                                    wrapLabel: '自动换行',
                                    unwrapLabel: '保持原列',
                                    copy: '复制',
                                    copied: '已复制',
                                    collapseAria: '收起差异',
                                    collapse: '收起',
                                    expandAria: (n) => `展开其余 ${n} 行差异`,
                                    expand: (n) => `… 其余 ${n} 行`,
                                } })] })), hasOutput && !diffs && (!terminal || typeof call.output !== 'string') && (_jsxs("section", { className: "cwn-tool-io", children: [_jsx("span", { children: "\u7ED3\u679C" }), _jsx(Value, { value: call.output, label: `${title} 结果` })] })), !hasInput && !hasOutput && !terminal && item.detail && (_jsx(Value, { value: detailValue(item.detail), label: `${title} 详情` })), chain.unresolved && _jsx("p", { className: "cwn-process-note", children: "\u7236\u8C03\u7528\u5173\u7CFB\u672A\u5B8C\u6574\u63D0\u4F9B\uFF1B\u6309\u5DF2\u6709\u987A\u5E8F\u5C55\u793A\u3002" })] })) }) }));
}
function ProcessItem({ item, rows, worker }) {
    const [open, setOpen] = useState(false);
    if (item.kind === 'reasoning')
        return _jsx(Reasoning, { item: item });
    if (item.kind === 'tool')
        return _jsx(Tool, { item: item, rows: rows, worker: worker });
    if (item.kind === 'assistant')
        return (_jsxs("div", { className: "cwn-process-event", "data-empty-reply-id": item.id, children: ["\u65E0\u6B63\u6587\u56DE\u590D \u00B7 ", _jsx(UsageIndicator, { usage: item.usage, providerCredits: item.providerCredits, creditsBased: worker?.preference.cli === 'qoder' || worker?.preference.cli === 'qodercn', reply: true }), item.durationSeconds !== undefined && ` · CLI 报告耗时：${item.durationSeconds}秒`, " \u00B7", ' ', _jsx("time", { dateTime: item.time, children: messageClock(item.time) }), item.sessionDurationSeconds !== undefined && ` · CLI 会话累计耗时：${item.sessionDurationSeconds}秒`] }));
    return (_jsx(DisclosureRow, { icon: _jsx(IconCodeOutlineRegular, { size: 14 }), title: item.text, open: open, expandable: !!item.detail, expandOnRowClick: true, onToggle: () => setOpen(!open), children: open && item.detail && (_jsx("div", { className: "cwn-reasoning-body", children: _jsx(MarkdownText, { text: item.detail, labels: markdownLabels, variant: "compact" }) })) }));
}
/** One consecutive process span. User/assistant boundaries stay outside it in native order. */
export function WorkerProcessGroup({ items, rows, worker, hidden, first, }) {
    const [open, setOpen] = useState(false), policy = useNativePresentation(), bodyId = useId();
    const content = processContent(items, worker), closed = processClosed(rows, worker);
    const grouped = policy.stepGrouping === 'collapsed' || (policy.stepGrouping === 'history' && closed);
    useEffect(() => {
        if (hidden)
            setOpen(false);
    }, [hidden]);
    if (!content.length)
        return null;
    const tools = content.filter((row) => row.kind === 'tool');
    const latestRunning = content.findLast((row) => rowState(row).running);
    const liveDetail = !closed && policy.liveProcessDetail
        ? (latestRunning?.toolCall?.name ??
            latestRunning?.toolCall?.command ??
            (latestRunning?.kind === 'reasoning' ? reasoningSummary(latestRunning.detail ?? '', true) : ''))
        : '';
    const label = !closed && latestRunning
        ? latestRunning.kind === 'tool'
            ? '正在调用工具'
            : '正在分析请求'
        : tools.length
            ? '已调用工具'
            : content.some((row) => row.kind === 'reasoning')
                ? '已完成分析'
                : '工作记录';
    const title = liveDetail ? `${label} · ${liveDetail}` : label;
    const running = content.some((row) => rowState(row).running);
    const show = !hidden && (!grouped || open);
    return (_jsxs("div", { className: "cwn-process-group", hidden: hidden, "data-process-group": runOf(items[0]), children: [grouped && (_jsxs("button", { type: "button", className: "cwn-process-group-title", "aria-expanded": open, "aria-controls": bodyId, onClick: (event) => {
                    event.currentTarget.focus();
                    setOpen(!open);
                }, children: [_jsxs("span", { className: "cwn-process-group-icon", children: [_jsx("span", { className: "cwn-process-activity", children: tools.length ? (_jsx(IconFlatListOutlineRegular, { size: 14 })) : (_jsx(IconThinkOutlineRegular, { size: 14 })) }), _jsx("span", { className: "cwn-process-chevron", children: open ? _jsx(IconChevronUpOutlineRegular, { size: 14 }) : _jsx(IconChevronDownOutlineRegular, { size: 14 }) })] }), _jsx(TextShimmer, { active: running, children: title })] })), _jsx("div", { id: bodyId, className: "cwn-process-group-body", hidden: !show, children: show && (_jsxs(_Fragment, { children: [first && !rows.some((row) => row.kind === 'reasoning' && row.detail?.trim()) && (_jsx("p", { className: "cwn-process-note", children: "CLI \u672A\u63D0\u4F9B\u516C\u5F00\u601D\u8003\u6458\u8981\u3002" })), content.map((item) => (_jsx(ProcessItem, { item: item, rows: rows, worker: worker }, item.id)))] })) })] }));
}
//# sourceMappingURL=worker-process.js.map