import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Input, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { operationMessage } from "./operation-error.js";
import { Glyph } from "./icons.js";
import { value } from "./workers.js";
const emptyDraft = () => ({ name: '', summary: '', prompt: '' });
/** The Host stores the library; saved workers keep their own role snapshot. */
export function RolePresetsPane({ api, sessionId }) {
    const [presets, setPresets] = useState([]);
    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [revision, setRevision] = useState(0);
    const action = useRef();
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        void (async () => {
            try {
                const next = JSON.parse(value(await api.cliworker.rolePresets(sessionId, controller.signal)));
                if (!controller.signal.aborted)
                    setPresets(next);
            }
            catch (e) {
                if (!controller.signal.aborted)
                    setError(operationMessage(e));
            }
            finally {
                if (!controller.signal.aborted)
                    setLoading(false);
            }
        })();
        return () => controller.abort();
    }, [api, sessionId, revision]);
    useEffect(() => () => action.current?.abort(), []);
    const openEditor = (next) => {
        setDraft({ ...next });
        setConfirmDelete(false);
        setError('');
        setFeedback('');
    };
    const closeEditor = () => {
        if (busy)
            return;
        setDraft(undefined);
        setConfirmDelete(false);
        setError('');
    };
    async function persist(remove = false) {
        if (!draft || action.current || (remove && !draft.id))
            return;
        const request = {
            ...draft,
            name: draft.name.trim(),
            summary: draft.summary.trim(),
            prompt: draft.prompt.trim(),
        };
        if (!remove && (!request.name || !request.summary || !request.prompt)) {
            setError('请填写智能体名称、概述和角色提示词。');
            return;
        }
        const controller = new AbortController();
        action.current = controller;
        setBusy(true);
        setError('');
        try {
            if (remove) {
                value(await api.cliworker.deleteRolePreset(sessionId, draft.id, controller.signal));
                if (!controller.signal.aborted) {
                    setPresets((old) => old.filter((item) => item.id !== draft.id));
                    setFeedback('预设已删除，已有智能体保留原角色。');
                }
            }
            else {
                const saved = JSON.parse(value(await api.cliworker.saveRolePreset(sessionId, JSON.stringify(request), controller.signal)));
                if (!controller.signal.aborted) {
                    setPresets((old) => old.some((item) => item.id === saved.id)
                        ? old.map((item) => (item.id === saved.id ? saved : item))
                        : [...old, saved]);
                    setFeedback('预设已保存，可在下次派遣时选择。');
                }
            }
            if (!controller.signal.aborted) {
                setDraft(undefined);
                setConfirmDelete(false);
            }
        }
        catch (e) {
            if (!controller.signal.aborted)
                setError(operationMessage(e));
        }
        finally {
            if (!controller.signal.aborted) {
                action.current = undefined;
                setBusy(false);
            }
        }
    }
    const visible = presets.filter((item) => `${item.name} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase()));
    return (_jsxs("section", { className: "cwn-settings-pane cwn-roles-pane", "aria-label": "\u667A\u80FD\u4F53\u9884\u8BBE\u7BA1\u7406", children: [_jsxs("div", { className: "cwn-roles-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: draft ? (draft.id ? '编辑智能体' : '新增智能体') : '智能体预设' }), _jsx("p", { children: draft ? '定义它的职责、方法与工作边界' : '为不同任务准备合适的协作者' })] }), _jsx("span", { className: "cwn-section-progress", role: "status", "aria-label": loading || busy ? '正在同步智能体预设' : undefined, children: (loading || busy) && _jsx(StateDot, { state: "ongoing", size: 14 }) })] }), draft ? (_jsxs("form", { className: "cwn-role-editor", onSubmit: (event) => {
                    event.preventDefault();
                    void persist();
                }, children: [_jsxs(Button, { type: "button", variant: "outline", size: "md", className: "cwn-role-back", onClick: closeEditor, disabled: busy, children: [_jsx(Glyph, { name: "back" }), "\u8FD4\u56DE\u9884\u8BBE"] }), _jsxs("label", { children: [_jsx("span", { children: "\u667A\u80FD\u4F53\u540D\u79F0" }), _jsx(Input, { className: "cwn-control-input", "aria-label": "\u667A\u80FD\u4F53\u540D\u79F0", autoFocus: true, value: draft.name, maxLength: 60, disabled: busy, onChange: (e) => setDraft({ ...draft, name: e.target.value }), placeholder: "\u4F8B\u5982\uFF1A\u903B\u8F91\u5BA1\u7A3F\u4EBA" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u6982\u8FF0" }), _jsx(Input, { className: "cwn-control-input", "aria-label": "\u667A\u80FD\u4F53\u6982\u8FF0", value: draft.summary, maxLength: 240, disabled: busy, onChange: (e) => setDraft({ ...draft, summary: e.target.value }), placeholder: "\u7528\u4E00\u53E5\u8BDD\u63CF\u8FF0\u64C5\u957F\u7684\u4EFB\u52A1" })] }), _jsxs("label", { children: [_jsx("span", { children: "\u89D2\u8272\u63D0\u793A\u8BCD" }), _jsx("textarea", { "aria-label": "\u89D2\u8272\u63D0\u793A\u8BCD", value: draft.prompt, maxLength: 30000, disabled: busy, onChange: (e) => setDraft({ ...draft, prompt: e.target.value }), placeholder: "\u63CF\u8FF0\u667A\u80FD\u4F53\u7684\u89D2\u8272\u3001\u5DE5\u4F5C\u65B9\u5F0F\u4E0E\u8F93\u51FA\u8981\u6C42\u2026", rows: 14 })] }), _jsxs("div", { className: "cwn-role-editor-actions", children: [draft.id && (_jsx(Button, { type: "button", variant: "primary", size: "md", className: "cwn-role-delete", disabled: busy, onClick: () => setConfirmDelete(true), children: "\u5220\u9664\u9884\u8BBE" })), _jsx(Button, { type: "button", variant: "outline", size: "md", disabled: busy, onClick: closeEditor, children: "\u53D6\u6D88" }), _jsx(Button, { type: "submit", variant: "primary", size: "md", disabled: busy, children: "\u4FDD\u5B58\u9884\u8BBE" })] }), confirmDelete && (_jsxs("div", { className: "cwn-role-delete-confirm", role: "alert", children: [_jsxs("p", { children: ["\u5220\u9664\u300C", draft.name, "\u300D\uFF1F\u5DF2\u6709\u667A\u80FD\u4F53\u4ECD\u4FDD\u7559\u539F\u89D2\u8272\u3002"] }), _jsx(Button, { type: "button", variant: "outline", size: "md", disabled: busy, onClick: () => setConfirmDelete(false), children: "\u4FDD\u7559\u9884\u8BBE" }), _jsx(Button, { type: "button", variant: "primary", size: "md", className: "cwn-role-delete", disabled: busy, onClick: () => void persist(true), children: "\u786E\u8BA4\u5220\u9664" })] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-roles-toolbar", children: [_jsx(Input, { className: "cwn-control-input", icon: _jsx(Glyph, { name: "search" }), "aria-label": "\u641C\u7D22\u667A\u80FD\u4F53\u9884\u8BBE", type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\u641C\u7D22\u667A\u80FD\u4F53" }), _jsx(Button, { type: "button", variant: "primary", size: "md", disabled: loading, onClick: () => openEditor(emptyDraft()), children: "\u65B0\u589E\u9884\u8BBE" })] }), _jsx("div", { className: "cwn-role-grid", "aria-busy": loading, children: visible.map((item) => (_jsx("article", { className: "cwn-role-card", children: _jsxs("button", { type: "button", "aria-label": `编辑预设 ${item.name}`, onClick: () => openEditor(item), children: [_jsxs("span", { className: "cwn-role-card-heading", children: [_jsx("strong", { children: item.name }), _jsx(Glyph, { name: "chevron" })] }), _jsx("span", { className: "cwn-role-card-summary", children: item.summary })] }) }, item.id))) }), !loading && !error && !visible.length && (_jsx("p", { className: "cwn-role-empty", children: presets.length ? '没有匹配的预设。' : '还没有预设，添加一个智能体角色吧。' })), !loading && error && (_jsx(Button, { type: "button", variant: "ghost", size: "md", onClick: () => setRevision((n) => n + 1), children: "\u91CD\u65B0\u52A0\u8F7D\u9884\u8BBE" }))] })), _jsx("div", { className: "cwn-role-feedback", role: error ? 'alert' : 'status', children: error || feedback })] }));
}
//# sourceMappingURL=role-presets.js.map