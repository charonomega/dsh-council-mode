import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { value } from "./workers.js";
import { t, useT } from "./i18n.js";
import { hostText } from "./operation-error.js";
const featureLabels = {
    send: '发送',
    queue: '原生排队',
    steer: '原生引导',
    stop: '原生停止',
    model: '模型与强度',
    permission: '权限',
    plan: '规划模式',
    attachments: '附件',
    fork: '分支',
    forkEarlier: '从较早消息分支',
    goal: '目标',
    feedback: '反馈',
    skills: '技能共享',
    tools: '工具共享',
};
const bridgedFeatures = new Set(['goal', 'feedback', 'forkEarlier']);
const fallbackReason = '当前 CLI 的此项原生操作尚未接通，操作已禁用。';
const composerHolds = new WeakMap();
/** Independent occurrences may hold the same child; releasing one must not unlock another. */
export function retainHarnessComposerBlock(conversation, sessionId, reason) {
    if (!reason)
        return () => { };
    const blocks = conversation.blocks;
    const snapshot = () => blocks.storeFor(sessionId).getSnapshot();
    const sessions = composerHolds.get(blocks) ?? new Map();
    composerHolds.set(blocks, sessions);
    const state = sessions.get(sessionId) ?? {
        owners: new Map(),
        previous: snapshot(),
        current: undefined,
    };
    sessions.set(sessionId, state);
    const token = Symbol();
    state.owners.set(token, reason);
    const publish = () => {
        state.current = { reason: [...state.owners.values()].at(-1) };
        blocks.set(sessionId, state.current);
    };
    publish();
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        state.owners.delete(token);
        if (snapshot() === state.current) {
            if (state.owners.size)
                publish();
            else
                blocks.set(sessionId, state.previous);
        }
        if (!state.owners.size)
            sessions.delete(sessionId);
    };
}
/** Validate only a Host-issued Harness identity; CLI conversation ids are never substituted. */
export function readHarnessConversationBinding(raw, parentSessionId) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new Error(t('原生会话绑定无效'));
    const candidate = raw;
    if (typeof candidate.sessionId !== 'string' ||
        !candidate.sessionId.trim() ||
        candidate.parentSessionId !== parentSessionId ||
        candidate.sessionId === parentSessionId ||
        candidate.mode !== 'continuable' ||
        !candidate.capabilities ||
        Object.keys(featureLabels).some((feature) => !bridgedFeatures.has(feature) &&
            typeof candidate.capabilities?.[feature] !== 'boolean'))
        throw new Error(t('原生会话身份或能力与当前子 Agent 不一致'));
    if (candidate.reasons &&
        (typeof candidate.reasons !== 'object' ||
            Array.isArray(candidate.reasons) ||
            Object.values(candidate.reasons).some((reason) => typeof reason !== 'string')))
        throw new Error(t('原生会话能力说明无效'));
    // An older Host omits the bridged features; treat them as unavailable rather than invalid.
    const capabilities = { ...candidate.capabilities };
    for (const feature of bridgedFeatures)
        capabilities[feature] ||= false;
    return { ...candidate, capabilities };
}
export function harnessComposerBlock(binding) {
    if (!binding.capabilities.send)
        return hostText(binding.reasons?.send) || t('原生消息发送尚未接通。');
    return undefined;
}
/** Displayed inside the existing Worker details menu, never as extra composer controls. */
export function HarnessCapabilityNotes({ binding }) {
    useT();
    const unavailable = Object.keys(featureLabels).filter((feature) => !binding.capabilities[feature]);
    return (_jsxs("div", { className: "cwn-native-capabilities", "aria-label": t('原生功能支持范围'), children: [_jsx("p", { children: t('对话使用 DSH 原生输入、队列和停止操作；实际回复由当前 CLI Agent 生成。') }), binding.capabilities.steer && binding.reasons?.steer && _jsx("p", { children: hostText(binding.reasons.steer) }), _jsx("p", { children: t('共享工具、MCP 与技能以当前子 Agent 获准的目录及 CLI 接入能力为准。') }), _jsx("dl", { children: unavailable.map((feature) => {
                    const reason = hostText(binding.reasons?.[feature]) || t(fallbackReason);
                    return (_jsxs("div", { children: [_jsx("dt", { children: t(featureLabels[feature]) }), _jsx("dd", { children: reason })] }, feature));
                }) })] }));
}
/** Retain the exact child inside the right sidebar's native Conversation occurrence. */
export function HarnessConversation({ services, bindings, api, parentSessionId, worker, renderConversation, attachProjections, }) {
    useT();
    const key = `${parentSessionId}:${worker.id}`;
    const [attempt, setAttempt] = useState(0);
    const [repairing, setRepairing] = useState(false);
    const [repair, setRepair] = useState();
    const repairRequest = useRef();
    const [state, setState] = useState({ key });
    const stored = worker.harnessConversation;
    const latestStored = useRef(stored);
    latestStored.current = stored;
    const repairBinding = repair?.key === key &&
        (!stored ||
            stored.sessionId === repair.previousSessionId ||
            stored.sessionId === repair.binding.sessionId)
        ? repair.binding
        : undefined;
    useEffect(() => () => repairRequest.current?.abort(), [key]);
    useEffect(() => {
        let current = true;
        const controller = new AbortController();
        let reference;
        let stopObserving;
        let detachProjections;
        const release = () => {
            stopObserving?.();
            stopObserving = undefined;
            const held = reference;
            reference = undefined;
            const detach = detachProjections;
            detachProjections = undefined;
            try {
                detach?.();
            }
            finally {
                held?.release();
            }
        };
        setState({ key });
        void (async () => {
            let stage = 'binding';
            try {
                const raw = repairBinding ??
                    (api.cliworker.ensureHarnessConversation
                        ? JSON.parse(value(await api.cliworker.ensureHarnessConversation(parentSessionId, worker.id)))
                        : (stored ??
                            (() => {
                                throw new Error(t('当前 Host 尚未提供原生会话入口，请更新插件后重开。'));
                            })()));
                const binding = readHarnessConversationBinding(raw, parentSessionId);
                if (!current)
                    return;
                reference = services.sessions.retain({
                    parentSessionId: binding.parentSessionId,
                    childSessionId: binding.sessionId,
                    mode: binding.mode,
                }, { source: 'cliworkerConversation', signal: controller.signal });
                if (reference.sessionId !== binding.sessionId)
                    throw new Error(t('原生会话引用与 Host 绑定不一致'));
                stage = 'history';
                const opened = await reference.ready;
                if (opened.sessionId !== binding.sessionId)
                    throw new Error(t('原生会话读取返回了其他身份'));
                if (!current)
                    return;
                stage = 'sources';
                bindings.publish(binding, worker);
                detachProjections = attachProjections?.(reference, { ...binding, workerId: worker.id });
                const baseline = latestStored.current;
                // ready settles even when opening the history failed. Observe the
                // official Session face for both that failure and later stream errors.
                const publish = () => {
                    if (!current)
                        return;
                    const snapshot = opened.session.getSnapshot();
                    const error = snapshot.openState === 'error'
                        ? snapshot.openError
                            ? `${snapshot.openError.message} (${snapshot.openError.code})`
                            : t('原生会话历史读取失败。')
                        : undefined;
                    setState((previous) => previous.key === key &&
                        previous.binding === binding &&
                        previous.reference === reference &&
                        previous.error === error
                        ? previous
                        : { key, binding, reference, error, baseline, historyFailure: error !== undefined });
                };
                stopObserving = opened.session.subscribe(publish);
                publish();
            }
            catch (error) {
                release();
                if (current)
                    setState({ key, error: error instanceof Error ? hostText(error.message) : t('无法打开原生会话'), historyFailure: stage === 'history' });
            }
        })();
        return () => {
            current = false;
            controller.abort();
            release();
        };
        // A later Worker snapshot confirming this same binding must not release the
        // active input generation or remount its draft. Host identity changes require reopening.
    }, [services.sessions, api, bindings, attachProjections, parentSessionId, worker.id, key, attempt, repairBinding?.sessionId]);
    const current = state.key === key ? state : undefined;
    useEffect(() => {
        if (stored &&
            current?.binding &&
            stored.sessionId !== current.binding.sessionId &&
            stored.sessionId !== repair?.previousSessionId)
            setAttempt((value) => value + 1);
    }, [stored?.sessionId, current?.binding?.sessionId, repair?.previousSessionId]);
    let binding = current?.binding;
    let bindingError;
    if (binding && stored !== current?.baseline && stored?.sessionId === binding.sessionId) {
        try {
            binding = readHarnessConversationBinding(stored, parentSessionId);
        }
        catch (error) {
            binding = undefined;
            bindingError = error instanceof Error ? error.message : t('原生会话绑定无效');
        }
    }
    if (binding &&
        stored &&
        stored.sessionId !== binding.sessionId &&
        stored.sessionId !== repair?.previousSessionId) {
        binding = undefined;
        bindingError = t('Host 原生会话绑定已改变，请重新打开确认。');
    }
    useLayoutEffect(() => {
        if (!binding || current?.error || bindingError)
            return;
        bindings.publish(binding, worker);
    }, [
        bindings,
        binding,
        current?.error,
        bindingError,
        worker.preference?.model,
        worker.preference?.effort,
        worker.observedModel,
    ]);
    let body;
    const failedSessionId = current?.binding?.sessionId ?? stored?.sessionId;
    const canRepairHistory = current?.historyFailure === true && !bindingError;
    if (current?.error || bindingError)
        body = (_jsxs("div", { role: "alert", className: "cwn-notice", children: [_jsx("p", { children: current?.error || bindingError }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: repairing, onClick: () => {
                        const recover = api.cliworker.repairHarnessConversation;
                        if (!canRepairHistory || !failedSessionId || !recover) {
                            setAttempt((value) => value + 1);
                            return;
                        }
                        const controller = new AbortController();
                        repairRequest.current?.abort();
                        repairRequest.current = controller;
                        setRepairing(true);
                        void recover(parentSessionId, worker.id, failedSessionId, controller.signal)
                            .then((response) => {
                            controller.signal.throwIfAborted();
                            const next = readHarnessConversationBinding(JSON.parse(value(response)), parentSessionId);
                            setRepair({ key, previousSessionId: failedSessionId, binding: next });
                        })
                            .catch((error) => {
                            if (!controller.signal.aborted)
                                setState({ key, error: error instanceof Error ? hostText(error.message) : t('显示会话修复失败'), historyFailure: true });
                        })
                            .finally(() => {
                            if (repairRequest.current === controller) {
                                repairRequest.current = undefined;
                                if (!controller.signal.aborted)
                                    setRepairing(false);
                            }
                        });
                    }, children: repairing
                        ? t('正在修复…')
                        : canRepairHistory && failedSessionId && api.cliworker.repairHarnessConversation
                            ? t('修复显示会话')
                            : t('重新打开') })] }));
    else if (binding && current?.reference)
        body = renderConversation(current.reference);
    else
        body = (_jsx("p", { className: "cwn-notice", role: "status", children: t('正在打开原生子会话…') }));
    return (_jsx("div", { className: "cwn-harness-conversation", "data-cliworker-native-sidebar": worker.id, children: body }));
}
//# sourceMappingURL=harness-conversation.js.map