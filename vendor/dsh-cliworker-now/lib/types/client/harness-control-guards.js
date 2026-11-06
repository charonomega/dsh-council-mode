import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useDshConversation } from "./dsh-subagents.js";
import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Toast } from '@deepseek-ai/dsh-client-ui-primitives';
import { harnessFeatureReason } from "./harness-feature-support.js";
import { HarnessReasonTooltip } from "./harness-native-tooltip.js";
import { useHarnessSessionBinding, } from "./harness-binding-registry.js";
import { NativeCliModelDirectory } from "./native-cli-model-directory.js";
import { useWorkers, value } from "./workers.js";
import { active, cliOf } from "../shared/types.js";
import { cliLevelOptions } from "../shared/worker-permissions.js";
import { t, useT } from "./i18n.js";
import { hostText } from "./operation-error.js";
const seats = {
    'conversation.input.model': { feature: 'model', label: '模型与强度' },
    'conversation.input.permission': { feature: 'permission', label: '权限' },
    'conversation.input.plan': { feature: 'plan', label: '规划模式' },
};
// PermissionSelect uses these public preset values to choose its native glyph,
// narrow-container layout and full-access confirmation. Not `auto`: DSH would
// relabel it 自动审查. Keep Worker levels at the Gateway boundary.
const nativePermissionPreset = { ask: 'read-only', auto: 'workspace-write', full: 'danger-full-access' };
function cliPermissionLevel(preset) {
    return Object.keys(nativePermissionPreset).find((level) => nativePermissionPreset[level] === preset);
}
/** Native components own every menu, focus rule, confirmation and interaction. */
function CliControl({ Native, props, binding, feature, api, unavailable, }) {
    const { snapshot, connecting, error } = useWorkers(api, binding.parentSessionId, binding.workerId);
    // The public session-list store receives the same Host projection frames as
    // the parent's controls. Observe its exact parent; do not retain or navigate it.
    // These values invalidate a read, never grant a permission locally.
    const parentSessionId = binding.parentSessionId;
    const parentPermission = props.useSessions((state) => state.projectionsBySession[parentSessionId]?.values.permissions);
    const parentPlan = props.useSessions((state) => state.projectionsBySession[parentSessionId]?.values.plan);
    // Equivalent replayed frames must not cancel a valid in-flight save.
    const parentAuthority = JSON.stringify([
        parentSessionId, parentPermission?.currentValue, parentPlan?.active, parentPlan?.pending,
    ]);
    const selected = snapshot.selected;
    const worker = selected &&
        selected.id === binding.workerId &&
        selected.parentSessionId === binding.parentSessionId &&
        selected.harnessConversation?.sessionId === binding.sessionId
        ? selected
        : undefined;
    const nativeBusy = props.useSession((session) => session.running || session.pendingSubmissions.length > 0);
    const inbox = props.useProjection('inbox');
    const nativeQueued = !!(inbox?.['next-turn'].length || inbox?.['next-step'].length);
    const reason = connecting || error || !worker
        ? error || t('正在读取当前 CLI 设置')
        : nativeBusy || active(worker.status) || snapshot.selectedBusy
            ? t('请等待本轮结束后再修改设置')
            : nativeQueued || snapshot.queuedFollowups?.length
                ? t('请先发送或移除待发消息（包含已暂停消息），再修改设置')
                : hostText(snapshot.resumeBlockedReason);
    const locked = props.locked || !!reason || !!unavailable;
    const [directory, setDirectory] = useState();
    const initialWorker = useRef(worker);
    initialWorker.current = worker;
    useEffect(() => {
        if (feature !== 'model' || !initialWorker.current)
            return;
        const next = new NativeCliModelDirectory(api, binding.parentSessionId, initialWorker.current);
        setDirectory(next);
        next.load();
        return () => next.dispose();
    }, [api, binding.parentSessionId, binding.workerId, !!worker, feature]);
    useLayoutEffect(() => {
        if (worker)
            directory?.sync(worker, locked);
    }, [directory, worker, locked]);
    const [permissionState, setPermissionState] = useState();
    // An old writable receipt cannot keep the native control enabled between
    // the parent projection changing and the replacement read effect running.
    const permission = permissionState?.authority === parentAuthority ? permissionState.value : undefined;
    const [toast, setToast] = useState();
    const mounted = useRef(false);
    const saving = useRef();
    const permissionRead = useRef();
    const permissionVersion = useRef(0);
    const [permissionSaving, setPermissionSaving] = useState(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            saving.current?.abort();
        };
    }, []);
    useEffect(() => () => saving.current?.abort(), [parentAuthority]);
    useEffect(() => {
        if (feature === 'model' || !worker || !api.cliworker.permissionForWorker)
            return;
        const request = (permissionRead.current = new AbortController());
        const version = ++permissionVersion.current;
        setPermissionState(undefined);
        void api.cliworker
            .permissionForWorker(binding.parentSessionId, worker.id, request.signal)
            .then((result) => {
            if (!request.signal.aborted && version === permissionVersion.current)
                setPermissionState({ authority: parentAuthority, value: JSON.parse(value(result)) });
        })
            .catch((failure) => {
            if (!request.signal.aborted)
                setToast(failure instanceof Error ? failure.message : String(failure));
        });
        return () => request.abort();
    }, [api, feature, binding.parentSessionId, binding.workerId, worker?.mode, worker?.level, worker?.status, locked, parentAuthority]);
    /** @param setting - A level from the menu, or the plan switch (`plan` / `accept-edits`). */
    const selectPermission = async (setting) => {
        if (locked ||
            saving.current ||
            !worker ||
            !permission?.writable ||
            !api.cliworker.configureWorkerPermission ||
            (setting === 'plan'
                ? !permission.plan.supported
                : setting !== 'accept-edits' && !permission.options.some((option) => option.value === setting)))
            return false;
        permissionRead.current?.abort();
        const request = (saving.current = new AbortController());
        const version = ++permissionVersion.current;
        setPermissionSaving(true);
        try {
            const saved = JSON.parse(value(await api.cliworker.configureWorkerPermission(binding.parentSessionId, worker.id, setting, request.signal)));
            if (request.signal.aborted || !mounted.current)
                return false;
            if (saved.id !== worker.id || saved.parentSessionId !== binding.parentSessionId)
                throw new Error(t('收到不匹配的 Worker 设置'));
            if (version === permissionVersion.current)
                setPermissionState({
                    authority: parentAuthority,
                    value: {
                        ...permission,
                        // The Host saved this level; it runs as chosen.
                        currentValue: setting === 'plan' || setting === 'accept-edits' ? permission.currentValue : (saved.level ?? 'full'),
                        plan: { ...permission.plan, active: saved.mode === 'plan' },
                    },
                });
            return true;
        }
        catch (failure) {
            if (!request.signal.aborted && mounted.current)
                setToast(failure instanceof Error ? failure.message : String(failure));
            return false;
        }
        finally {
            if (saving.current === request)
                saving.current = undefined;
            if (mounted.current)
                setPermissionSaving(false);
        }
    };
    let control;
    if (feature === 'model') {
        control = directory
            ? createElement(Native, {
                ...props,
                locked,
                available: true,
                directory: directory.store,
                load: directory.load,
                select: directory.select,
            })
            : createElement(Native, { ...props, locked: true });
    }
    else {
        // Until the Host answers, the control stays locked; the CLI's own levels stand in.
        const options = (permission?.options ?? (worker ? cliLevelOptions(cliOf(worker.preference)) : [])).map((option) => ({
            ...option,
            value: nativePermissionPreset[option.value],
        }));
        const currentLevel = permission?.currentValue ?? worker?.level;
        const currentValue = currentLevel && nativePermissionPreset[currentLevel];
        const planActive = permission?.plan.active ?? worker?.mode === 'plan';
        const catalog = {
            value: { options, defaultOptions: options, defaultPreset: currentValue ?? 'workspace-write' },
        };
        const originalProjection = props.useProjection;
        // Only these two setting projections are mapped. Inbox, draft and Agent lifecycle stay native.
        const useProjection = ((key, selector) => {
            if (key === 'permissions' || key === 'plan') {
                const state = key === 'permissions'
                    ? currentValue
                        ? { currentValue }
                        : undefined
                    : { active: planActive, pending: false };
                return selector ? selector(state) : state;
            }
            return originalProjection(key, selector);
        });
        control = createElement(Native, {
            ...props,
            locked: locked || permissionSaving || !permission?.writable,
            useProjection,
            usePermissionCatalog: (selector) => selector ? selector(catalog) : catalog,
            select: (preset) => {
                const level = cliPermissionLevel(preset);
                return level ? selectPermission(level) : Promise.resolve(false);
            },
            exitPlanMode: async () => (await selectPermission('accept-edits')) ? null : t('权限设置未保存，请核对当前任务与权限状态'),
        });
    }
    const explanation = unavailable || reason || (feature !== 'model' ? permission?.reason : undefined);
    return (_jsxs(_Fragment, { children: [explanation ? (_jsx(HarnessReasonTooltip, { label: explanation, side: "top", children: control })) : (control), toast && _jsx(Toast, { text: toast, onDone: () => setToast(undefined) })] }));
}
/** Reuse each actual native leaf; only its documented business data/actions change. */
const controlGuards = new WeakMap();
/** Share one delegating registration per slot registry and exact authority. */
export function installHarnessControlGuards(ctx, bindings, api) {
    let held = controlGuards.get(ctx.slots);
    if (held && (held.bindings !== bindings || held.api !== api))
        throw new Error(t('原生 CLI 控件已由另一组会话权限绑定接管'));
    if (!held) {
        held = { bindings, api, owners: 0, release: registerHarnessControlGuards(ctx, bindings, api) };
        controlGuards.set(ctx.slots, held);
    }
    const lease = held;
    lease.owners++;
    let released = false;
    return () => {
        if (released)
            return;
        released = true;
        if (--lease.owners)
            return;
        controlGuards.delete(ctx.slots);
        lease.release();
    };
}
function registerHarnessControlGuards(ctx, bindings, api) {
    const releases = [];
    for (const name of Object.keys(seats)) {
        let original, own, dispose;
        let updating = false;
        const sync = () => {
            if (updating)
                return;
            const next = ctx.slots
                .entries(name)
                .filter((entry) => entry !== own)
                .sort((left, right) => (left.options.priority ?? 0) - (right.options.priority ?? 0))[0];
            if (next === original)
                return;
            updating = true;
            dispose?.();
            dispose = undefined;
            own = undefined;
            original = next;
            if (next) {
                const Native = next.component;
                const { feature, label } = seats[name];
                function BoundControl(props) {
                    useT();
                    const dsh = useDshConversation(props.sessionId);
                    const binding = useHarnessSessionBinding(bindings, props.sessionId);
                    if (dsh)
                        return null;
                    if (!binding)
                        return createElement(Native, props);
                    const unavailable = feature === 'plan' ? harnessFeatureReason(binding, 'plan') : undefined;
                    // Locked, but mapped to the CLI's real mode instead of the parent's preset.
                    if (unavailable && feature === 'permission' && api && binding.workerId)
                        return (_jsx(CliControl, { Native: Native, props: props, binding: binding, feature: feature, api: api, unavailable: unavailable }, `${binding.sessionId}:${binding.workerId}`));
                    // No plan mode: leave the seat empty; the "+" menu still explains why.
                    if (unavailable && feature === 'plan')
                        return null;
                    if (unavailable)
                        return (_jsx(HarnessReasonTooltip, { label: unavailable, side: "top", children: createElement(Native, { ...props, locked: true, select: async () => false, exitPlanMode: async () => null }) }));
                    if (api && binding.workerId)
                        return (_jsx(CliControl, { Native: Native, props: props, binding: binding, feature: feature, api: api }, `${binding.sessionId}:${binding.workerId}`));
                    const reason = hostText(binding.reasons?.[feature]) || t('{label}正在等待 CLI 连接信息', { label: t(label) });
                    return (_jsx(HarnessReasonTooltip, { label: reason, side: "top", children: createElement(Native, { ...props, locked: true }) }));
                }
                const unregister = ctx.slots.register({
                    name,
                    priority: (next.options.priority ?? 0) - 1,
                    ...(next.inject ? { inject: next.inject } : {}),
                    ...(next.locale ? { locale: next.locale } : {}),
                    ...(next.store ? { store: next.store } : {}),
                    ...(next.select ? { select: next.select } : {}),
                }, BoundControl);
                const shadow = ctx.slots.entries(name).find((entry) => entry.component === BoundControl);
                // The original remains the sole child-slot declarant. Re-registering
                // its children would conflict; this delegating shadow needs the same
                // render kit without taking ownership of those declarations.
                if (shadow && next.children)
                    shadow.children = next.children;
                own = shadow;
                dispose = () => {
                    // SlotCore releases an entry's children on disposal. Drop only our
                    // borrowed render metadata so native label entries remain live.
                    if (shadow && shadow.children === next.children)
                        delete shadow.children;
                    unregister();
                };
            }
            updating = false;
        };
        releases.push(ctx.slots.subscribe(name, sync));
        sync();
        releases.push(() => {
            updating = true;
            dispose?.();
        });
    }
    return () => {
        for (const release of releases.reverse())
            release();
    };
}
//# sourceMappingURL=harness-control-guards.js.map