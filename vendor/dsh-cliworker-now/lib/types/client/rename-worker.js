import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Modal, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { workerName } from "../shared/types.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { useT } from "./i18n.js";
export function RenameWorker({ api, sessionId, worker, mode = 'name', onClose, }) {
    const t = useT();
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
            setError(titleMode ? t('请输入聊天标题。') : t('请输入智能体名称。'));
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
    return (_jsx(Modal, { open: true, onClose: close, title: titleMode ? t('聊天标题') : t('智能体名称'), closeLabel: titleMode ? t('关闭聊天标题编辑') : t('关闭智能体命名'), className: "cwn-rename-dialog", contentClassName: "cwn-rename-content", children: _jsxs("form", { className: "cwn-rename-form", onSubmit: (event) => {
                event.preventDefault();
                void save();
            }, children: [_jsx(Input, { className: "cwn-control-input cwn-rename-input", "aria-label": titleMode ? t('新的聊天标题') : t('新的智能体名称'), "data-modal-autofocus": true, value: name, maxLength: titleMode ? 160 : 60, disabled: saving, onChange: (event) => setName(event.target.value) }), !titleMode && _jsx("p", { children: t('之后可在主对话中通过这个名字继续调用。') }), error && (_jsx("div", { className: "cwn-rename-error", role: "alert", children: error })), _jsxs("div", { className: "cwn-rename-actions", children: [_jsx(Button, { type: "button", size: "md", variant: "outline", onClick: close, children: t('取消') }), _jsxs(Button, { type: "submit", size: "md", variant: "primary", disabled: saving, children: [saving && _jsx(StateDot, { state: "ongoing", size: 14 }), titleMode ? t('保存标题') : t('保存名称')] })] })] }) }));
}
//# sourceMappingURL=rename-worker.js.map