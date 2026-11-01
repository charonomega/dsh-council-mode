import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, StateDot, Input, Menu, MenuItemButton, IconChevronDownOutlineRegular, IconChevronRightOutlineRegular, IconCheckOutlineRegular, } from '@deepseek-ai/dsh-client-ui-primitives';
import { active, cliOf, CLI_LABELS, effortLabel, } from "../shared/types.js";
import { modelName } from "../shared/models.js";
import { displayModelName, visibleModelChoices } from "../shared/model-presentation.js";
import { value } from "./workers.js";
import { operationMessage } from "./operation-error.js";
/** Native menu primitive with the same model / effort drill-in flow as Harness ModelSelect. */
export function WorkerModelMenu({ worker, api, sessionId, disabled, disabledReason, }) {
    const cli = cliOf(worker.preference);
    const [open, setOpen] = useState(false);
    const [pane, setPane] = useState('root');
    const [catalog, setCatalog] = useState();
    const [error, setError] = useState('');
    const [attempt, retry] = useState(0);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState('');
    const [selection, setSelection] = useState(worker.preference);
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);
    useEffect(() => {
        setSelection(worker.preference);
    }, [worker.id, worker.preference.model, worker.preference.effort, worker.preference.cli]);
    useEffect(() => {
        if (!worker.conversationId)
            return;
        const controller = new AbortController();
        setLoading(true);
        setCatalog(undefined);
        setError('');
        void api.cliworker
            .catalogForWorker(sessionId, worker.id, controller.signal)
            .then((result) => {
            if (controller.signal.aborted)
                return;
            const next = JSON.parse(value(result));
            if (next.cli !== cli)
                throw new Error('收到不匹配的 CLI 模型目录，请重试');
            if (!Array.isArray(next.models) || !next.models.length)
                throw new Error(next.notice || '此 CLI 未返回可用模型，请登录或刷新重试');
            setCatalog(next);
        })
            .catch((e) => {
            if (!controller.signal.aborted) {
                setCatalog(undefined);
                setError(operationMessage(e));
            }
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [api, sessionId, worker.id, worker.conversationId, cli, attempt]);
    const identity = modelName(selection);
    const chosen = catalog?.models.find((m) => m.id === identity || Object.values(m.variants ?? {}).includes(selection.model));
    const visible = visibleModelChoices(catalog?.models ?? [], selection.model);
    const name = visible.find((model) => model.id === chosen?.id)?.label ?? displayModelName(selection);
    const locked = disabled || saving || active(worker.status);
    const choicesLocked = locked || loading || !catalog || !!error;
    const close = () => {
        if (!saving) {
            setOpen(false);
            setPane('root');
            setQuery('');
        }
    };
    const save = async (next) => {
        if (choicesLocked ||
            next.cli !== cli ||
            !catalog?.models.some((item) => item.id === next.model && item.efforts?.includes(next.effort)))
            return;
        setSaving(true);
        setError('');
        try {
            value(await api.cliworker.configureWorker(sessionId, worker.id, JSON.stringify(next)));
            if (alive.current) {
                setSelection(next);
                setOpen(false);
                setPane('root');
                setQuery('');
            }
        }
        catch (e) {
            if (alive.current)
                setError(operationMessage(e));
        }
        finally {
            if (alive.current)
                setSaving(false);
        }
    };
    const cell = (label, text) => (_jsxs("span", { className: "cwn-model-cell", children: [_jsx("span", { children: label }), _jsx("span", { className: "cwn-model-cell-value", children: text }), _jsx(IconChevronRightOutlineRegular, { size: 12 })] }));
    const items = pane === 'root'
        ? [
            { id: 'model', label: cell('模型', name), disabled: choicesLocked },
            {
                id: 'effort',
                label: cell('思考强度', effortLabel(selection.effort)),
                disabled: choicesLocked || !chosen,
            },
        ]
        : [
            { id: 'back', label: '‹ 返回', disabled: saving },
            ...(pane === 'effort'
                ? (chosen?.efforts ?? []).map((e) => ({ id: e, label: effortLabel(e), disabled: choicesLocked }))
                : []),
        ];
    return (_jsxs(Menu, { open: open, portal: true, align: "end", side: "top", className: "cwn-model-menu", listClassName: "cwn-model-popover", items: items, selectedId: pane === 'effort' ? selection.effort : undefined, onClose: close, onSelect: (id) => {
            if (id === 'back') {
                setPane('root');
                return;
            }
            if (choicesLocked)
                return;
            if (pane === 'root') {
                setPane(id);
                return;
            }
            if (pane === 'effort' && chosen?.efforts?.includes(id))
                void save({ cli, model: chosen.id, effort: id });
        }, anchor: _jsxs(Button, { type: "button", variant: "ghost", size: "sm", className: "cwn-compose-model", disabled: locked, "aria-label": "\u6A21\u578B\u4E0E\u5F3A\u5EA6", "aria-haspopup": "menu", "aria-expanded": open, onClick: () => (open ? close() : setOpen(true)), title: disabledReason ||
                (active(worker.status)
                    ? '本轮结束后可以修改模型与强度'
                    : `${name} · ${effortLabel(selection.effort)}`), children: [_jsx("span", { children: name }), _jsx("span", { className: "cwn-model-effort", children: effortLabel(selection.effort) }), _jsx(IconChevronDownOutlineRegular, { className: "cwn-model-chevron", size: 12 })] }), children: [pane === 'model' && (_jsxs(_Fragment, { children: [_jsx(Input, { className: "cwn-model-search", "aria-label": "\u641C\u7D22\u6A21\u578B", placeholder: "\u641C\u7D22\u6A21\u578B", value: query, onChange: (e) => setQuery(e.target.value) }), _jsx("div", { className: "cwn-model-provider", children: CLI_LABELS[cli] }), visible
                        .filter((m) => `${m.id} ${m.label}`.toLowerCase().includes(query.toLowerCase()))
                        .map((m) => (_jsx(MenuItemButton, { disabled: choicesLocked, onSelect: () => {
                            const effort = m.efforts?.includes(selection.effort) ? selection.effort : m.efforts?.[0];
                            if (effort)
                                void save({ cli, model: m.id, effort });
                        }, children: _jsxs("span", { className: "cwn-model-cell", children: [_jsx("span", { title: m.label, children: m.label }), m.id === chosen?.id && _jsx(IconCheckOutlineRegular, { size: 14 })] }) }, m.id)))] })), loading && (_jsxs("div", { className: "cwn-model-provider", role: "status", children: [_jsx(StateDot, { state: "ongoing", size: 14 }), " \u6B63\u5728\u8BFB\u53D6\u6A21\u578B\u76EE\u5F55\u2026"] })), saving && (_jsxs("div", { className: "cwn-model-provider", role: "status", children: [_jsx(StateDot, { state: "ongoing", size: 14 }), " \u6B63\u5728\u4FDD\u5B58\u6A21\u578B\u8BBE\u7F6E\u2026"] })), error && (_jsxs("div", { className: "cwn-model-feedback", role: "status", children: [error, _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => retry((n) => n + 1), children: "\u91CD\u8BD5" })] }))] }));
}
//# sourceMappingURL=worker-model-menu.js.map