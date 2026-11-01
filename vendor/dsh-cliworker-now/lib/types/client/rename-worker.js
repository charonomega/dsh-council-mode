import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { workerName } from "../shared/types.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
export function RenameWorker({ api, sessionId, worker, mode = 'name', onClose, }) {
    const titleMode = mode === 'title';
    const [name, setName] = useState(titleMode ? worker.title : workerName(worker));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef();
    useEffect(() => () => pending.current?.abort(), []);
    const close = () => {
        pending.current?.abort();
        pending.current = undefined;
        onClose();
    };
    const save = async () => {
        if (pending.current)
            return;
        if (!name.trim()) {
            setError(titleMode ? '请输入聊天标题。' : '请输入智能体名称。');
            return;
        }
        const controller = new AbortController();
        pending.current = controller;
        setSaving(true);
        setError('');
        try {
            value(await (titleMode
                ? api.cliworker.renameWorkerTitle(sessionId, worker.id, name.trim(), controller.signal)
                : api.cliworker.renameWorker(sessionId, worker.id, name.trim(), controller.signal)));
            if (!controller.signal.aborted)
                onClose();
        }
        catch (e) {
            if (!controller.signal.aborted)
                setError(operationMessage(e));
        }
        finally {
            if (!controller.signal.aborted) {
                pending.current = undefined;
                setSaving(false);
            }
        }
    };
    return (_jsx(Modal, { open: true, onClose: close, title: titleMode ? '聊天标题' : '智能体名称', closeLabel: titleMode ? '关闭聊天标题编辑' : '关闭智能体命名', className: "cwn-rename-dialog", contentClassName: "cwn-rename-content", children: _jsxs("form", { className: "cwn-rename-form", onSubmit: (event) => {
                event.preventDefault();
                void save();
            }, children: [_jsx(Input, { className: "cwn-control-input cwn-rename-input", "aria-label": titleMode ? '新的聊天标题' : '新的智能体名称', "data-modal-autofocus": true, value: name, maxLength: titleMode ? 160 : 60, disabled: saving, onChange: (event) => setName(event.target.value) }), !titleMode && _jsx("p", { children: "\u4E4B\u540E\u53EF\u5728\u4E3B\u5BF9\u8BDD\u4E2D\u901A\u8FC7\u8FD9\u4E2A\u540D\u5B57\u7EE7\u7EED\u8C03\u7528\u3002" }), error && (_jsx("div", { className: "cwn-rename-error", role: "alert", children: error })), _jsxs("div", { className: "cwn-rename-actions", children: [_jsx(Button, { type: "button", size: "md", variant: "outline", onClick: close, children: "\u53D6\u6D88" }), _jsxs(Button, { type: "submit", size: "md", variant: "primary", disabled: saving, children: [saving && _jsx(StateDot, { state: "ongoing", size: 14 }), titleMode ? '保存标题' : '保存名称'] })] })] }) }));
}
//# sourceMappingURL=rename-worker.js.map