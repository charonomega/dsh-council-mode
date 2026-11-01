import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { IconDatabaseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { compactTokens } from "../shared/telemetry.js";
import { StatPopover } from "./stat-popover.js";
export function UsageIndicator({ usage, reply = false, providerCredits, creditsBased = false }) {
    const scope = {
        response: '本次回复',
        run: '本轮任务',
        session: 'CLI 会话累计',
        reported: 'CLI 报告值（不跨轮重复相加）',
    };
    const credits = typeof providerCredits === 'number' && Number.isFinite(providerCredits) && providerCredits >= 0 ? providerCredits : undefined;
    const creditUsage = creditsBased || credits !== undefined;
    const total = creditUsage
        ? `${credits === undefined ? '—' : credits > 0 && credits < 0.0001 ? '<0.0001' : credits.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} 积分`
        : usage ? `${compactTokens(usage.total)} tok` : '— tok';
    return (_jsxs(StatPopover, { label: reply ? `${creditUsage ? '积分用量' : '用量'} ${total}` : total, className: `cwn-stat cwn-usage${reply ? ' cwn-reply-usage' : ''}`, trigger: _jsxs(_Fragment, { children: [_jsx(IconDatabaseOutlineRegular, { size: 14 }), _jsxs("span", { children: [reply ? creditUsage ? '积分用量 ' : '用量 ' : '', total] })] }), children: [_jsxs("div", { className: "cwn-stat-title", children: [_jsxs("span", { children: [_jsx(IconDatabaseOutlineRegular, { size: 14 }), creditUsage ? '积分用量' : 'Token 用量'] }), _jsx("span", { children: creditUsage ? credits?.toLocaleString('zh-CN', { maximumFractionDigits: 12 }) ?? '—' : usage ? `${usage.total.toLocaleString('en-US')} tok` : '—' })] }), _jsx("div", { className: "cwn-stat-rule" }), credits !== undefined && _jsxs("dl", { className: "cwn-stat-details", children: [_jsx("dt", { children: "\u672C\u8F6E\u79EF\u5206" }), _jsx("dd", { children: credits.toLocaleString('zh-CN', { maximumFractionDigits: 12 }) })] }), creditUsage ? null : usage ? (_jsxs("dl", { className: "cwn-stat-details", children: [_jsx("dt", { children: "\u7EDF\u8BA1\u8303\u56F4" }), _jsx("dd", { children: scope[usage.scope] }), usage.input !== undefined && (_jsxs(_Fragment, { children: [_jsx("dt", { children: "\u8F93\u5165" }), _jsxs("dd", { children: [usage.input.toLocaleString('en-US'), " tok"] })] })), usage.cacheRead !== undefined && (_jsxs(_Fragment, { children: [_jsx("dt", { children: "\u7F13\u5B58\u8BFB\u53D6" }), _jsxs("dd", { children: [usage.cacheRead.toLocaleString('en-US'), " tok"] })] })), usage.output !== undefined && (_jsxs(_Fragment, { children: [_jsx("dt", { children: "\u8F93\u51FA" }), _jsxs("dd", { children: [usage.output.toLocaleString('en-US'), " tok"] })] }))] })) : (_jsxs("dl", { className: "cwn-stat-details", children: [_jsx("dt", { children: "\u7528\u91CF" }), _jsx("dd", { children: "\u2014" })] }))] }));
}
const contextRows = [
    { key: 'systemTokens', label: '系统提示词', color: 'system' },
    { key: 'toolTokens', label: '工具定义', color: 'tools' },
    { key: 'messageTokens', label: '对话消息', color: 'messages' },
];
const count = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
export function contextFigures(telemetry) {
    const used = count(telemetry?.contextUsed), rawCapacity = count(telemetry?.contextCapacity);
    const capacity = rawCapacity !== undefined && rawCapacity > 0 ? rawCapacity : undefined;
    const nativeRatio = telemetry?.contextRatio;
    const percent = typeof nativeRatio === 'number' && Number.isFinite(nativeRatio) && nativeRatio >= 0 && nativeRatio <= 1
        ? Math.round(nativeRatio * 1000) / 10
        : used !== undefined && capacity !== undefined && capacity > 0
            ? Math.min(100, Math.round((used / capacity) * 100))
            : undefined;
    const rows = contextRows.map((row) => ({ ...row, value: count(telemetry?.contextBreakdown?.[row.key]) }));
    const complete = rows.every((row) => row.value !== undefined);
    const total = complete ? rows.reduce((sum, row) => sum + row.value, 0) : 0;
    const segments = percent === undefined
        ? []
        : complete && total > 0
            ? rows
                .filter((row) => row.value > 0)
                .map((row) => ({ key: row.key, color: row.color, width: (percent * row.value) / total }))
            : [{ key: 'total', color: undefined, width: percent }];
    return { used, capacity, percent, rows, complete, segments };
}
/** rc.2 ContextMeter presentation, driven exclusively by this Worker's evidence. */
export function ContextDetails({ telemetry }) {
    const { used, capacity, percent, rows, segments } = contextFigures(telemetry);
    const source = [
        telemetry?.contextSource,
        telemetry?.contextCapacitySource,
        telemetry?.contextBreakdown?.source,
    ]
        .filter(Boolean)
        .join('；');
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-context-header", title: source || undefined, children: [_jsx("span", { className: "cwn-context-headline", children: "\u4E0A\u4E0B\u6587\u5DF2\u7528" }), _jsx("span", { className: "cwn-context-percent", children: percent === undefined ? '—' : `${percent}%` }), _jsxs("strong", { children: [used === undefined ? '—' : `${telemetry?.contextEstimated ? '~' : ''}${compactTokens(used)}`, " /", ' ', capacity === undefined ? '—' : compactTokens(capacity)] })] }), _jsx("div", { className: "cwn-context-bar", "aria-hidden": "true", children: segments
                    .filter((segment) => segment.width > 0)
                    .map((segment) => (_jsx("span", { className: segment.color ? `cwn-context-segment cwn-context-${segment.color}` : 'cwn-context-segment', style: { width: `${segment.width}%` } }, segment.key))) }), _jsx("dl", { className: "cwn-context-rows", children: rows.map((row) => (_jsxs("div", { className: "cwn-context-row", children: [_jsxs("dt", { children: [_jsx("span", { className: `cwn-context-swatch cwn-context-${row.color}`, "aria-hidden": "true" }), row.label] }), _jsx("dd", { title: row.value === undefined ? 'CLI 未提供该分项' : telemetry?.contextBreakdown?.source, children: row.value === undefined
                                ? '—'
                                : `${telemetry?.contextBreakdown?.estimated ? '~' : ''}${compactTokens(row.value)}` })] }, row.key))) })] }));
}
export function ComposerTelemetry({ worker, telemetry, statusLabel, }) {
    const { percent } = contextFigures(telemetry);
    const label = percent === undefined ? '上下文占用暂不可用' : `上下文已用 ${percent}%`;
    return (_jsxs("div", { className: "cwn-compose-state cwn-telemetry", children: [_jsxs("span", { className: "cwn-stat cwn-run-stat", children: [_jsx("span", { className: `cwn-dot ${worker.status}` }), _jsx("span", { children: statusLabel })] }), _jsx(UsageIndicator, { usage: telemetry?.usage, providerCredits: telemetry?.providerCredits, creditsBased: worker.preference.cli === 'qoder' || worker.preference.cli === 'qodercn' }), _jsx(StatPopover, { label: label, tooltip: label, context: true, className: "cwn-stat cwn-context", trigger: _jsxs(_Fragment, { children: [_jsxs("svg", { width: "14", height: "14", viewBox: "0 0 14 14", "aria-hidden": "true", children: [_jsx("circle", { cx: "7", cy: "7", r: "5.5", className: "cwn-context-track" }), percent !== undefined && (_jsx("circle", { cx: "7", cy: "7", r: "5.5", className: "cwn-context-fill", strokeDasharray: `${(percent * Math.PI * 11) / 100} ${Math.PI * 11}`, transform: "rotate(-90 7 7)" }))] }), _jsx("span", { children: percent === undefined ? '—' : `${percent}%` })] }), children: _jsx(ContextDetails, { telemetry: telemetry }) }, worker.id)] }));
}
//# sourceMappingURL=telemetry.js.map