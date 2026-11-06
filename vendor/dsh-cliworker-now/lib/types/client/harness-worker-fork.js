import { jsx as _jsx } from "react/jsx-runtime";
import { createElement, useSyncExternalStore } from 'react';
import { IconBranchOutlineRegular, MenuItemButton, Toast, } from '@deepseek-ai/dsh-client-ui-primitives';
import { active } from "../shared/types.js";
import { HarnessReasonTooltip } from "./harness-native-tooltip.js";
import { harnessFeatureReason } from "./harness-feature-support.js";
import { useHarnessSessionBinding } from "./harness-binding-registry.js";
import { shadowHarnessSlot } from "./harness-slot-shadow.js";
import { value } from "./workers.js";
import { t, useT } from "./i18n.js";
/** Only completed assistant turn boundaries can be addressed. Latest uses the wire sentinel. */
export function workerForkCut(turns, target) {
    if (!target)
        return { atMessageId: '' };
    const latest = turns.at(-1);
    const selected = turns.find((turn) => target.turn !== undefined ? turn.turn === target.turn : turn.seq === target.seq);
    if (!selected)
        return { atMessageId: '', reason: t('只能从已完成的助手轮次分支') };
    return { atMessageId: selected === latest ? '' : selected.messageId };
}
export class HarnessWorkerFork {
    services;
    bindings;
    api;
    states = new Map();
    pending = new Map();
    listeners = new Set();
    revision = 0;
    disposed = false;
    error = '';
    constructor(services, bindings, api) {
        this.services = services;
        this.bindings = bindings;
        this.api = api;
    }
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    getSnapshot = () => this.revision;
    getError = () => this.error;
    changed() {
        this.revision++;
        this.listeners.forEach((listener) => listener());
    }
    update(sessionId, snapshot) {
        if (this.states.get(sessionId) === snapshot)
            return;
        this.states.set(sessionId, snapshot);
        this.changed();
    }
    turns(sessionId) {
        const source = this.services.sessions.binding(sessionId);
        if (!source)
            return [];
        const chat = this.services.uiConversation
            .binding(source)
            .target('chat')
            .getSnapshot();
        return [...(chat?.timeline.turns.values() ?? [])]
            .flatMap((turn) => {
            const messageId = turn.data.get('turn-tail')?.closing?.finalNode.messageId;
            return turn.end?.data.reason.kind === 'completed' && messageId
                ? [{ turn: turn.turn, seq: turn.end.seq, messageId }]
                : [];
        })
            .sort((a, b) => a.seq - b.seq);
    }
    cut(sessionId, target) {
        return workerForkCut(this.turns(sessionId), target);
    }
    reason(sessionId, cut = { atMessageId: '' }) {
        const binding = this.bindings.get(sessionId);
        if (!binding?.workerId)
            return t('正在读取当前 CLI 会话');
        const unsupported = harnessFeatureReason(binding, 'fork');
        if (unsupported)
            return unsupported;
        const snapshot = this.states.get(sessionId);
        const session = this.services.sessions.binding(sessionId)?.session;
        const native = session?.getSnapshot();
        const inbox = session?.projections.faceOf('inbox').getSnapshot();
        if (this.pending.has(sessionId) ||
            native?.running ||
            native?.pendingSubmissions.length ||
            snapshot?.selectedBusy ||
            snapshot?.configuring ||
            (snapshot?.selected && active(snapshot.selected.status)))
            return t('请等待当前运行结束后再分支');
        if (snapshot?.queuedFollowups?.length || inbox?.['next-turn']?.length || inbox?.['next-step']?.length)
            return t('请发送或移除待发消息后再分支');
        if (!snapshot?.selected)
            return t('正在读取当前 CLI 状态');
        return cut.reason || (cut.atMessageId ? harnessFeatureReason(binding, 'forkEarlier') : undefined);
    }
    /** Unsupported/busy paths settle without a request or an error notification. */
    async fork(sessionId, cut = { atMessageId: '' }) {
        const binding = this.bindings.get(sessionId);
        if (this.disposed || !binding?.workerId || this.reason(sessionId, cut))
            return;
        const request = new AbortController();
        this.pending.set(sessionId, request);
        this.error = '';
        this.changed();
        try {
            if (!this.api.cliworker.forkWorker)
                throw new Error(t('Host 尚未提供 CLI 会话分支'));
            const result = JSON.parse(value(await this.api.cliworker.forkWorker(binding.parentSessionId, binding.workerId, cut.atMessageId, request.signal)));
            if (request.signal.aborted)
                return;
            this.services.uiWorkspace.openSession({
                parentSessionId: binding.parentSessionId,
                childSessionId: result.childSessionId,
                mode: 'continuable',
            });
            return result.childSessionId;
        }
        catch (error) {
            if (!request.signal.aborted)
                this.error = error instanceof Error ? error.message : String(error);
        }
        finally {
            this.pending.delete(sessionId);
            this.changed();
        }
    }
    dismissError = () => {
        this.error = '';
        this.changed();
    };
    dispose() {
        this.disposed = true;
        this.pending.forEach((request) => request.abort());
        this.pending.clear();
        this.states.clear();
        this.listeners.clear();
    }
}
/** Patch the shared public dispatch boundary, including existing shortcut closures.
 * defineProperty intentionally reaches the service instance through Cordis' tracker;
 * assignment would write only to the caller's temporary shadow object. */
export function installHarnessForkRouting(services, forks) {
    const sessions = services.sessions;
    const previous = Object.getOwnPropertyDescriptor(sessions, 'fork');
    const native = sessions.fork;
    const routed = async function (options) {
        if (!forks.bindings.get(options.sessionId)?.workerId)
            return native.call(this, options);
        const cut = options.atSeq === undefined ? { atMessageId: '' } : forks.cut(options.sessionId, { seq: options.atSeq });
        const child = await forks.fork(options.sessionId, cut);
        if (child)
            options.onCreated?.(child);
        return child ?? options.sessionId;
    };
    Object.defineProperty(sessions, 'fork', { configurable: true, writable: true, value: routed });
    return () => {
        // Preserve any later owner instead of restoring over it.
        if (Object.getOwnPropertyDescriptor(sessions, 'fork')?.value !== routed)
            return;
        if (previous)
            Object.defineProperty(sessions, 'fork', previous);
        else
            delete sessions.fork;
    };
}
export function installHarnessForkMenu(ctx, bindings, forks) {
    return shadowHarnessSlot(ctx.slots, 'sidebar.workspaces.session.menu.item', 'fork', (original) => {
        const Native = original.component;
        function Fork(props) {
            const binding = useHarnessSessionBinding(bindings, props.sessionId);
            useSyncExternalStore(forks.subscribe, forks.getSnapshot);
            if (!binding?.workerId)
                return createElement(Native, props);
            return _jsx(WorkerForkMenu, { ...props, forks: forks });
        }
        return { component: Fork, inject: original.inject };
    });
}
function WorkerForkMenu({ forks, sessionId, useMenuOpenState, useShortcuts, }) {
    useT();
    const menu = useMenuOpenState?.();
    const shortcut = useShortcuts?.((rows) => rows.find((row) => row.id === 'session.fork'));
    const reason = forks.reason(sessionId);
    const row = (_jsx(MenuItemButton, { shortcut: shortcut, disabled: !!reason, icon: _jsx(IconBranchOutlineRegular, {}), onSelect: () => {
            if (forks.reason(sessionId))
                return;
            menu?.[1](false);
            void forks.fork(sessionId);
        }, children: t('分支') }));
    // Below, like the native message branch button's tooltip.
    return reason ? (_jsx(HarnessReasonTooltip, { label: reason, side: "bottom", children: row })) : (row);
}
export function HarnessForkNotice({ forks }) {
    useSyncExternalStore(forks.subscribe, forks.getSnapshot);
    return forks.getError() ? _jsx(Toast, { text: forks.getError(), onDone: forks.dismissError }) : null;
}
//# sourceMappingURL=harness-worker-fork.js.map