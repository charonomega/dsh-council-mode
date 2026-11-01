import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Input, StateDot, IconChevronDownOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { CLI_LABELS } from "../shared/types.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { RunningMessageChoice } from "./running-message-settings.js";
function readPath(raw, cli) {
    const next = JSON.parse(raw);
    if (next?.cli !== cli ||
        typeof next.path !== 'string' ||
        typeof next.available !== 'boolean' ||
        !['auto', 'manual', 'configured', 'none'].includes(next.source) ||
        (next.error !== undefined && typeof next.error !== 'string'))
        throw new Error('收到不匹配的 CLI 路径信息，请刷新重试');
    return next;
}
/** Path management remains usable for a disabled CLI and never saves model defaults. */
export function CliExecutableSettings({ api, sessionId, cli, blocked, accountLoading, accountRevision, onApplied, onBusyChange, }) {
    const [expanded, setExpanded] = useState(false);
    const [hasExpanded, setHasExpanded] = useState(false);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modeSaving, setModeSaving] = useState(false);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const contentId = useId();
    const inputId = useId();
    const hintId = useId();
    const draftRef = useRef(draft);
    const baseline = useRef('');
    const revision = useRef(0);
    const request = useRef();
    const callbacks = useRef({ onApplied, onBusyChange });
    callbacks.current = { onApplied, onBusyChange };
    const service = api.cliworker;
    const pathBlocked = blocked || modeSaving;
    useEffect(() => {
        callbacks.current.onBusyChange(saving || modeSaving);
    }, [saving, modeSaving]);
    useEffect(() => () => {
        request.current?.controller.abort();
        request.current = undefined;
    }, []);
    useEffect(() => {
        if (request.current?.kind === 'write')
            return;
        request.current?.controller.abort();
        request.current = undefined;
        setLoading(false);
        if (!expanded || blocked || accountLoading)
            return;
        const controller = new AbortController();
        const editRevision = revision.current;
        const dirty = draftRef.current.trim() !== baseline.current;
        request.current = { controller, kind: 'read' };
        setLoading(true);
        void (async () => {
            try {
                const next = readPath(value(await service.cliExecutablePath(sessionId, cli, controller.signal)), cli);
                if (controller.signal.aborted || revision.current !== editRevision)
                    return;
                baseline.current = next.path;
                if (!dirty) {
                    draftRef.current = next.path;
                    setDraft(next.path);
                    setError(next.error || '');
                }
            }
            catch (error) {
                if (!controller.signal.aborted && revision.current === editRevision)
                    setError(operationMessage(error));
            }
            finally {
                if (request.current?.controller === controller) {
                    request.current = undefined;
                    setLoading(false);
                }
            }
        })();
    }, [service, sessionId, cli, expanded, blocked, accountLoading, accountRevision]);
    async function refresh(action) {
        if (pathBlocked || request.current?.kind === 'write')
            return;
        request.current?.controller.abort();
        const controller = new AbortController();
        const submitted = draftRef.current.trim();
        request.current = { controller, kind: 'write' };
        setLoading(false);
        setSaving(true);
        setError('');
        setFeedback('');
        try {
            const next = readPath(value(await service.refreshCliExecutablePath(sessionId, cli, submitted, action, controller.signal)), cli);
            if (controller.signal.aborted)
                return;
            baseline.current = next.path;
            if (action === 'auto' || next.available) {
                draftRef.current = next.path;
                setDraft(next.path);
            }
            setError(next.error || (!next.available ? '未找到可用 CLI，请检查路径后重试' : ''));
            setFeedback(next.available ? (action === 'auto' ? '已恢复自动识别' : 'CLI 路径已刷新') : '');
            // A saved but unavailable manual path must also invalidate the previous
            // account and models; the Host retains that explicit choice.
            callbacks.current.onApplied();
        }
        catch (error) {
            if (!controller.signal.aborted)
                setError(operationMessage(error));
        }
        finally {
            if (request.current?.controller === controller) {
                request.current = undefined;
                setSaving(false);
            }
        }
    }
    return (_jsxs("section", { className: "cwn-settings-section", "aria-label": "\u9AD8\u7EA7\u8BBE\u7F6E", children: [_jsxs("div", { className: "cwn-settings-section-head", children: [_jsx("h3", { className: "cwn-settings-advanced-heading", children: "\u9AD8\u7EA7\u8BBE\u7F6E" }), _jsx(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-advanced-toggle", "aria-label": "\u9AD8\u7EA7\u8BBE\u7F6E", "aria-expanded": expanded, "aria-controls": contentId, onClick: () => {
                            setHasExpanded(true);
                            setExpanded((old) => !old);
                        }, children: _jsx(IconChevronDownOutlineRegular, { size: 14 }) })] }), _jsx("div", { id: contentId, className: "cwn-settings-advanced-body", "data-expanded": expanded, "aria-hidden": !expanded, ...(!expanded ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-settings-advanced-body-inner", children: hasExpanded && (_jsxs(_Fragment, { children: [_jsx(RunningMessageChoice, { api: api, sessionId: sessionId, cli: cli, expanded: expanded, blocked: blocked || saving, onBusyChange: setModeSaving }, `${sessionId}:${cli}`), _jsxs("div", { className: "cwn-cli-path-settings", children: [_jsxs("label", { className: "cwn-setting-row-text", htmlFor: inputId, children: [_jsx("span", { children: "CLI \u8DEF\u5F84\u7BA1\u7406" }), _jsx("span", { className: "cwn-setting-description", id: hintId, children: "\u81EA\u52A8\u8BC6\u522B\u5B89\u88C5\u4F4D\u7F6E\uFF0C\u4E5F\u53EF\u8F93\u5165 CLI \u53EF\u6267\u884C\u6587\u4EF6\u7684\u5B8C\u6574\u8DEF\u5F84\u3002" })] }), _jsxs("form", { onSubmit: (event) => {
                                            event.preventDefault();
                                            void refresh(draftRef.current.trim() === baseline.current ? 'refresh' : 'manual');
                                        }, children: [_jsx(Input, { id: inputId, className: "cwn-control-input cwn-cli-path-input", "aria-label": `${CLI_LABELS[cli]} CLI 路径`, "aria-describedby": hintId, value: draft, disabled: pathBlocked || saving, spellCheck: false, autoComplete: "off", placeholder: "\u8F93\u5165 CLI \u53EF\u6267\u884C\u6587\u4EF6\u7684\u5B8C\u6574\u8DEF\u5F84", onChange: (event) => {
                                                    revision.current++;
                                                    draftRef.current = event.target.value;
                                                    setDraft(event.target.value);
                                                    setError('');
                                                    setFeedback('');
                                                } }), _jsxs("div", { className: "cwn-cli-path-actions", children: [_jsx(Button, { type: "button", variant: "ghost", size: "md", disabled: pathBlocked || saving, onClick: () => void refresh('auto'), children: "\u6062\u590D\u81EA\u52A8\u8BC6\u522B" }), _jsxs(Button, { type: "submit", variant: "outline", size: "md", "aria-label": "\u5237\u65B0 CLI \u8DEF\u5F84", disabled: pathBlocked || saving, children: [(loading || saving) && _jsx(StateDot, { state: "ongoing", size: 14 }), "\u5237\u65B0"] })] }), _jsx("p", { className: "cwn-cli-path-feedback", role: "status", children: pathBlocked
                                                    ? '请先结束当前账号操作或设置保存'
                                                    : error || feedback || (loading ? '正在检查 CLI 路径…' : '') })] })] })] })) }) })] }));
}
//# sourceMappingURL=cli-executable-settings.js.map