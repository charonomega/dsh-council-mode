import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { Button, Input, StateDot, IconChevronDownOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { CLI_LABELS } from "../shared/types.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { RunningMessageChoice } from "./running-message-settings.js";
import { t } from "./i18n.js";
import { hostText } from "./operation-error.js";
function readPath(raw, cli) {
    const next = JSON.parse(raw);
    if (next?.cli !== cli ||
        typeof next.path !== 'string' ||
        typeof next.available !== 'boolean' ||
        !['auto', 'manual', 'configured', 'none'].includes(next.source) ||
        (next.error !== undefined && typeof next.error !== 'string'))
        throw new Error(t('收到不匹配的 CLI 路径信息，请刷新重试'));
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
            setError(hostText(next.error) || (!next.available ? t('未找到可用 CLI，请检查路径后重试') : ''));
            setFeedback(next.available ? (action === 'auto' ? t('已恢复自动识别') : t('CLI 路径已刷新')) : '');
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
    return (_jsxs("section", { className: "cwn-settings-section", "aria-label": t('高级设置'), children: [_jsxs("div", { className: "cwn-settings-section-head", children: [_jsx("h3", { className: "cwn-settings-advanced-heading", children: t('高级设置') }), _jsx(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-advanced-toggle", "aria-label": t('高级设置'), "aria-expanded": expanded, "aria-controls": contentId, onClick: () => {
                            setHasExpanded(true);
                            setExpanded((old) => !old);
                        }, children: _jsx(IconChevronDownOutlineRegular, { size: 14 }) })] }), _jsx("div", { id: contentId, className: "cwn-settings-advanced-body", "data-expanded": expanded, "aria-hidden": !expanded, ...(!expanded ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-settings-advanced-body-inner", children: hasExpanded && (_jsxs(_Fragment, { children: [_jsx(RunningMessageChoice, { api: api, sessionId: sessionId, cli: cli, expanded: expanded, blocked: blocked || saving, onBusyChange: setModeSaving }, `${sessionId}:${cli}`), _jsxs("div", { className: "cwn-cli-path-settings", children: [_jsxs("label", { className: "cwn-setting-row-text", htmlFor: inputId, children: [_jsx("span", { children: t('CLI 路径管理') }), _jsx("span", { className: "cwn-setting-description", id: hintId, children: t('自动识别安装位置，也可输入 CLI 可执行文件的完整路径。') })] }), _jsxs("form", { onSubmit: (event) => {
                                            event.preventDefault();
                                            void refresh(draftRef.current.trim() === baseline.current ? 'refresh' : 'manual');
                                        }, children: [_jsx(Input, { id: inputId, className: "cwn-control-input cwn-cli-path-input", "aria-label": t('{cli} CLI 路径', { cli: CLI_LABELS[cli] }), "aria-describedby": hintId, value: draft, disabled: pathBlocked || saving, spellCheck: false, autoComplete: "off", placeholder: t('输入 CLI 可执行文件的完整路径'), onChange: (event) => {
                                                    revision.current++;
                                                    draftRef.current = event.target.value;
                                                    setDraft(event.target.value);
                                                    setError('');
                                                    setFeedback('');
                                                } }), _jsxs("div", { className: "cwn-cli-path-actions", children: [_jsx(Button, { type: "button", variant: "ghost", size: "md", disabled: pathBlocked || saving, onClick: () => void refresh('auto'), children: t('恢复自动识别') }), _jsxs(Button, { type: "submit", variant: "outline", size: "md", "aria-label": t('刷新 CLI 路径'), disabled: pathBlocked || saving, children: [(loading || saving) && _jsx(StateDot, { state: "ongoing", size: 14 }), t('刷新')] })] }), _jsx("p", { className: "cwn-cli-path-feedback", role: "status", children: pathBlocked
                                                    ? t('请先结束当前账号操作或设置保存')
                                                    : error || feedback || (loading ? t('正在检查 CLI 路径…') : '') })] })] })] })) }) })] }));
}
//# sourceMappingURL=cli-executable-settings.js.map