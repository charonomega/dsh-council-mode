import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createElement, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { InlineEditor, Tooltip, IconGoalOutlineRegular, IconPauseOutlineRegular, IconPlayOutlineRegular, IconEditOutlineRegular, IconTrashOutlineRegular, IconCheckOutlineRegular, IconCloseOutlineRegular, } from '@deepseek-ai/dsh-client-ui-primitives';
import { GOAL_OBJECTIVE_LIMIT } from "../shared/conversation-features.js";
import { harnessFeatureReason } from "./harness-feature-support.js";
import { useHarnessSessionBinding, } from "./harness-binding-registry.js";
import { shadowHarnessSlot } from "./harness-slot-shadow.js";
import { useWorkers, value } from "./workers.js";
import { harnessGoalEditor } from "./harness-goal-editor.js";
import { t, useT } from "./i18n.js";
/** Plugin state and CAS only: never reaches Harness goals or its automatic round driver. */
export function WorkerGoalBar({ api, binding, bindings, }) {
    useT();
    const { snapshot, connecting, error } = useWorkers(api, binding.parentSessionId, binding.workerId);
    const worker = snapshot.selected?.id === binding.workerId ? snapshot.selected : undefined;
    const baseline = JSON.stringify(worker?.goal);
    const [receipt, setReceipt] = useState();
    const goal = receipt && receipt.baseline === baseline ? receipt.goal : worker?.goal;
    const current = useRef(goal);
    current.current = goal;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [failure, setFailure] = useState('');
    const [pending, setPending] = useState(false);
    const request = useRef();
    const editor = harnessGoalEditor(bindings);
    const closeEditor = () => {
        editor.requests.delete(binding.sessionId);
        setEditing(false);
    };
    const editRequest = useSyncExternalStore((listener) => {
        editor.listeners.add(listener);
        return () => {
            editor.listeners.delete(listener);
        };
    }, () => editor.requests.get(binding.sessionId) ?? 0);
    useEffect(() => {
        if (!editRequest)
            return;
        setDraft(current.current?.objective ?? '');
        setFailure('');
        setEditing(true);
    }, [editRequest]);
    useEffect(() => () => request.current?.abort(), [binding.sessionId, binding.workerId]);
    const reason = harnessFeatureReason(binding, 'goal') ||
        error ||
        (connecting || !worker ? t('正在读取当前 CLI 目标') : undefined);
    const run = async (action) => {
        if (reason || request.current || !worker)
            return;
        const controller = (request.current = new AbortController());
        const revision = current.current?.revision ?? worker.goalRevision ?? 0;
        setPending(true);
        setFailure('');
        try {
            let next;
            if (action === 'edit') {
                if (!api.cliworker.setWorkerGoal)
                    throw new Error(t('Host 尚未提供 CLI 目标设置'));
                next = JSON.parse(value(await api.cliworker.setWorkerGoal(binding.parentSessionId, worker.id, draft.trim(), revision, controller.signal)));
            }
            else if (action === 'clear') {
                if (!api.cliworker.clearWorkerGoal)
                    throw new Error(t('Host 尚未提供 CLI 目标设置'));
                value(await api.cliworker.clearWorkerGoal(binding.parentSessionId, worker.id, revision, controller.signal));
            }
            else {
                if (!api.cliworker.setWorkerGoalStatus)
                    throw new Error(t('Host 尚未提供 CLI 目标设置'));
                next = JSON.parse(value(await api.cliworker.setWorkerGoalStatus(binding.parentSessionId, worker.id, action, revision, controller.signal)));
            }
            if (controller.signal.aborted)
                return;
            current.current = next;
            setReceipt({ baseline, goal: next });
            closeEditor();
        }
        catch (error) {
            if (!controller.signal.aborted)
                setFailure(error instanceof Error ? error.message : String(error));
        }
        finally {
            if (request.current === controller)
                request.current = undefined;
            if (!controller.signal.aborted)
                setPending(false);
        }
    };
    if (!goal && !editing)
        return null;
    const locked = !!reason || pending;
    const action = (key, Icon, onClick, disabled = locked) => (_jsx(Tooltip, { label: reason || t(key), side: "bottom", portal: true, children: _jsx("span", { tabIndex: disabled ? 0 : undefined, "aria-label": disabled ? reason : undefined, children: _jsx("button", { type: "button", className: "cwn-goal-icon", "aria-label": t(key), disabled: disabled, onClick: onClick, children: _jsx(Icon, { size: 14 }) }) }) }));
    return (_jsx("div", { className: "cwn-goal-dock", "data-goal-bar": true, "data-cliworker-goal": true, children: _jsxs("div", { className: `cwn-goal-bar${editing ? ' cwn-goal-edit' : ''}`, children: [editing ? (_jsx(InlineEditor, { value: draft, label: t('目标'), onChange: setDraft, onSave: () => {
                        if (!locked)
                            void run('edit');
                    }, onCancel: () => {
                        if (!pending)
                            closeEditor();
                    } })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "cwn-goal-glyph", children: _jsx(IconGoalOutlineRegular, { size: 14 }) }), _jsx("span", { className: "cwn-goal-label", children: goal?.status === 'paused' ? t('已暂停的目标') : t('进行中的目标') }), _jsx("span", { className: "cwn-goal-objective", children: goal?.objective })] })), failure && (_jsx("span", { className: "cwn-goal-error", role: "alert", children: failure })), _jsx("div", { className: "cwn-goal-actions", children: editing ? (_jsxs(_Fragment, { children: [action('保存目标', IconCheckOutlineRegular, () => {
                                void run('edit');
                            }, locked || !draft.trim() || draft.trim().length > GOAL_OBJECTIVE_LIMIT), action('取消', IconCloseOutlineRegular, closeEditor, pending)] })) : (_jsxs(_Fragment, { children: [goal?.status === 'paused'
                                ? action('恢复目标', IconPlayOutlineRegular, () => {
                                    void run('active');
                                })
                                : action('暂停目标', IconPauseOutlineRegular, () => {
                                    void run('paused');
                                }), action('编辑目标', IconEditOutlineRegular, () => {
                                setDraft(goal?.objective ?? '');
                                setEditing(true);
                            }), action('清除目标', IconTrashOutlineRegular, () => {
                                void run('clear');
                            })] })) })] }) }));
}
export function installHarnessWorkerGoal(ctx, bindings, api) {
    return shadowHarnessSlot(ctx.slots, 'conversation.input.dock', 'goal', (original) => {
        const Native = original.component;
        function Goal(props) {
            const binding = useHarnessSessionBinding(bindings, props.sessionId);
            return binding?.workerId ? (_jsx(WorkerGoalBar, { api: api, binding: binding, bindings: bindings }, binding.sessionId)) : (createElement(Native, props));
        }
        return {
            component: Goal,
            inject: (...args) => bindings.get(args[0])?.workerId ? {} : (original.inject?.(...args) ?? {}),
        };
    });
}
// Same dock geometry, 36px strip, spacing and theme tokens as Harness ui-goal.
export const workerGoalStyles = `
.cwn-goal-dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - 4 * var(--dsh-composer-dock-inset));margin:0 auto}
.cwn-goal-bar{isolation:isolate;box-sizing:border-box;width:100%;max-width:calc(var(--dsh-composer-card-max-width) - 4 * var(--dsh-composer-dock-inset));--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md);height:36px;box-shadow:var(--dsw-elevation-panel);border:0;align-items:center;gap:10px;margin:0 auto;padding:4px 5px 4px 12px;display:flex;position:relative}
.cwn-goal-bar:before{z-index:-1;border-radius:inherit;background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);content:"";pointer-events:none;position:absolute;inset:0}
.cwn-goal-glyph{color:var(--dsw-alias-label-tertiary);flex:none;display:inline-flex}
.cwn-goal-label{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:24px}
.cwn-goal-objective{min-width:0;color:var(--dsw-alias-label-primary-dimmed);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:13px;line-height:20px;overflow:hidden}
.cwn-goal-error{min-width:0;color:var(--dsw-alias-state-error-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;font-size:12px;line-height:20px;overflow:hidden}
.cwn-goal-edit{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);align-items:flex-end;height:auto;min-height:36px}
.cwn-goal-actions{flex:none;align-items:center;gap:10px;display:flex}
.cwn-goal-icon{width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:none;border:0;border-radius:999px;justify-content:center;align-items:center;padding:0;display:inline-flex}
.cwn-goal-icon:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}.cwn-goal-icon:disabled{opacity:.4;cursor:default}
`;
//# sourceMappingURL=harness-worker-goal.js.map