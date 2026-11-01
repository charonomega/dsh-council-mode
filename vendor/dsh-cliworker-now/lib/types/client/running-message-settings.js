import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { Button, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { RUNNING_MESSAGE_LABELS, } from "../shared/running-message.js";
import { NativeChoice } from "./native-settings-choice.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
function readSettings(raw, cli) {
    const next = JSON.parse(raw);
    if (next?.cli !== cli ||
        !['steer', 'interrupt', 'queue'].includes(next.mode) ||
        typeof next.canSteer !== 'boolean' ||
        (next.mode === 'steer' && !next.canSteer))
        throw new Error('收到不匹配的运行中发送设置，请重试');
    return next;
}
const descriptions = {
    steer: '立即交给 CLI 在当前运行中处理，不保证打断正在生成的内容。',
    interrupt: '先停止当前轮，确认停止后沿原对话优先发送。',
    queue: '等待当前轮正常结束后，沿原对话按顺序发送。',
};
/** Keyed by project session and CLI in the parent: late reads/writes cannot cross settings pages. */
export function RunningMessageChoice({ api, sessionId, cli, expanded, blocked, onBusyChange, }) {
    const [settings, setSettings] = useState();
    const [selected, setSelected] = useState();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [attempt, retry] = useState(0);
    const hintId = useId();
    const request = useRef();
    const busyCallback = useRef(onBusyChange);
    busyCallback.current = onBusyChange;
    const service = api.cliworker;
    useEffect(() => () => {
        request.current?.abort();
        request.current = undefined;
        busyCallback.current(false);
    }, []);
    useEffect(() => {
        if (!expanded || blocked || settings)
            return;
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        setError('');
        void (async () => {
            try {
                const next = readSettings(value(await service.runningMessageSettings(sessionId, cli, controller.signal)), cli);
                if (controller.signal.aborted)
                    return;
                setSettings(next);
                setSelected(next.mode);
            }
            catch (error) {
                if (!controller.signal.aborted)
                    setError(operationMessage(error));
            }
            finally {
                if (request.current === controller) {
                    request.current = undefined;
                    setLoading(false);
                }
            }
        })();
        return () => controller.abort();
    }, [service, sessionId, cli, expanded, blocked, !!settings, attempt]);
    async function save(mode) {
        if (!settings || blocked || request.current || (mode === 'steer' && !settings.canSteer))
            return;
        const controller = new AbortController();
        request.current = controller;
        setSelected(mode);
        setSaving(true);
        setSaved(false);
        setError('');
        busyCallback.current(true);
        try {
            const next = readSettings(value(await service.saveRunningMessageMode(sessionId, cli, mode, controller.signal)), cli);
            if (controller.signal.aborted)
                return;
            if (next.mode !== mode)
                throw new Error('发送方式未保存，请重新选择重试');
            setSettings(next);
            setSaved(true);
        }
        catch (error) {
            if (!controller.signal.aborted)
                setError(operationMessage(error));
        }
        finally {
            if (request.current === controller) {
                request.current = undefined;
                setSaving(false);
                busyCallback.current(false);
            }
        }
    }
    return (_jsxs("div", { className: "cwn-settings-form cwn-running-message-settings", children: [_jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: "\u8FD0\u884C\u4E2D\u53D1\u9001" }), _jsxs("span", { className: "cwn-setting-description", id: hintId, children: [selected ? descriptions[selected] : '选择对话运行中发送新消息的方式。', settings && !settings.canSteer ? ' 当前 CLI 不支持引导。' : ''] })] }), _jsx(NativeChoice, { label: "\u8FD0\u884C\u4E2D\u53D1\u9001", describedBy: hintId, selected: selected ?? '', placeholder: loading ? '正在读取…' : '选择发送方式', choices: [
                            { id: 'steer', label: RUNNING_MESSAGE_LABELS.steer, disabled: !settings?.canSteer },
                            { id: 'interrupt', label: RUNNING_MESSAGE_LABELS.interrupt },
                            { id: 'queue', label: RUNNING_MESSAGE_LABELS.queue },
                        ], disabled: blocked || loading || saving || !settings, onChange: (mode) => void save(mode) })] }), (loading || saving || saved || error) && (_jsxs("div", { className: "cwn-settings-save", children: [_jsxs("span", { className: "cwn-settings-feedback-slot", role: "status", children: [(loading || saving) && _jsx(StateDot, { state: "ongoing", size: 14 }), error || (loading ? '正在读取发送方式…' : saving ? '正在保存发送方式…' : '发送方式已保存')] }), error && !settings && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", disabled: blocked || loading, onClick: () => retry((old) => old + 1), children: "\u91CD\u8BD5\u8BFB\u53D6\u53D1\u9001\u65B9\u5F0F" }))] }))] }));
}
//# sourceMappingURL=running-message-settings.js.map