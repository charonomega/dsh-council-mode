import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Input, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { operationMessage } from "./operation-error.js";
import { Glyph } from "./icons.js";
import { value } from "./workers.js";
import { t, useT } from "./i18n.js";
const emptyDraft = () => ({ name: '', summary: '', prompt: '' });
/** The Host stores the library; saved workers keep their own role snapshot. */
export function RolePresetsPane({ api, sessionId }) {
    useT();
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
            setError(t('请填写智能体名称、概述和角色提示词。'));
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
                    setFeedback(t('预设已删除，已有智能体保留原角色。'));
                }
            }
            else {
                const saved = JSON.parse(value(await api.cliworker.saveRolePreset(sessionId, JSON.stringify(request), controller.signal)));
                if (!controller.signal.aborted) {
                    setPresets((old) => old.some((item) => item.id === saved.id)
                        ? old.map((item) => (item.id === saved.id ? saved : item))
                        : [...old, saved]);
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
    return (_jsxs("section", { className: "cwn-settings-pane cwn-roles-pane", "aria-label": t('智能体预设管理'), children: [_jsxs("div", { className: "cwn-roles-heading", children: [_jsxs("div", { children: [_jsx("h2", { children: draft ? (draft.id ? t('编辑智能体') : t('新增智能体')) : t('智能体预设') }), _jsx("p", { children: draft ? t('定义它的职责、方法与工作边界') : t('为不同任务准备合适的协作者') })] }), _jsx("span", { className: "cwn-section-progress", role: "status", "aria-label": loading || busy ? t('正在同步智能体预设') : undefined, children: (loading || busy) && _jsx(StateDot, { state: "ongoing", size: 14 }) })] }), draft ? (_jsxs("form", { className: "cwn-role-editor", onSubmit: (event) => {
                    event.preventDefault();
                    void persist();
                }, children: [_jsxs(Button, { type: "button", variant: "outline", size: "md", className: "cwn-role-back", onClick: closeEditor, disabled: busy, children: [_jsx(Glyph, { name: "back" }), t('返回预设')] }), _jsxs("label", { children: [_jsx("span", { children: t('智能体名称') }), _jsx(Input, { className: "cwn-control-input", "aria-label": t('智能体名称'), autoFocus: true, value: draft.name, maxLength: 60, disabled: busy, onChange: (e) => setDraft({ ...draft, name: e.target.value }), placeholder: t('例如：逻辑审稿人') })] }), _jsxs("label", { children: [_jsx("span", { children: t('概述') }), _jsx(Input, { className: "cwn-control-input", "aria-label": t('智能体概述'), value: draft.summary, maxLength: 240, disabled: busy, onChange: (e) => setDraft({ ...draft, summary: e.target.value }), placeholder: t('用一句话描述擅长的任务') })] }), _jsxs("label", { children: [_jsx("span", { children: t('角色提示词') }), _jsx("textarea", { "aria-label": t('角色提示词'), value: draft.prompt, maxLength: 30000, disabled: busy, onChange: (e) => setDraft({ ...draft, prompt: e.target.value }), placeholder: t('描述智能体的角色、工作方式与输出要求…'), rows: 14 })] }), _jsxs("div", { className: "cwn-role-editor-actions", children: [draft.id && (_jsx(Button, { type: "button", variant: "primary", size: "md", className: "cwn-role-delete", disabled: busy, onClick: () => setConfirmDelete(true), children: t('删除预设') })), _jsx(Button, { type: "button", variant: "outline", size: "md", disabled: busy, onClick: closeEditor, children: t('取消') }), _jsx(Button, { type: "submit", variant: "primary", size: "md", disabled: busy, children: t('保存预设') })] }), confirmDelete && (_jsxs("div", { className: "cwn-role-delete-confirm", role: "alert", children: [_jsx("p", { children: t('删除「{name}」？已有智能体仍保留原角色。', { name: draft.name }) }), _jsx(Button, { type: "button", variant: "outline", size: "md", disabled: busy, onClick: () => setConfirmDelete(false), children: t('保留预设') }), _jsx(Button, { type: "button", variant: "primary", size: "md", className: "cwn-role-delete", disabled: busy, onClick: () => void persist(true), children: t('确认删除') })] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-roles-toolbar", children: [_jsx(Input, { className: "cwn-control-input", icon: _jsx(Glyph, { name: "search" }), "aria-label": t('搜索智能体预设'), type: "search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: t('搜索智能体') }), _jsx(Button, { type: "button", variant: "primary", size: "md", disabled: loading, onClick: () => openEditor(emptyDraft()), children: t('新增预设') })] }), _jsx("div", { className: "cwn-role-grid", "aria-busy": loading, children: visible.map((item) => (_jsx("article", { className: "cwn-role-card", children: _jsxs("button", { type: "button", "aria-label": t('编辑预设 {name}', { name: item.name }), onClick: () => openEditor(item), children: [_jsxs("span", { className: "cwn-role-card-heading", children: [_jsx("strong", { children: item.name }), _jsx(Glyph, { name: "chevron" })] }), _jsx("span", { className: "cwn-role-card-summary", children: item.summary })] }) }, item.id))) }), !loading && !error && !visible.length && (_jsx("p", { className: "cwn-role-empty", children: presets.length ? t('没有匹配的预设。') : t('还没有预设，添加一个智能体角色吧。') })), !loading && error && (_jsx(Button, { type: "button", variant: "ghost", size: "md", onClick: () => setRevision((n) => n + 1), children: t('重新加载预设') }))] })), _jsx("div", { className: "cwn-role-feedback", role: error ? 'alert' : 'status', children: error || feedback })] }));
}
//# sourceMappingURL=role-presets.js.map