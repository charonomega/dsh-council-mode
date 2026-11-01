import { useSyncExternalStore } from 'react';
import { cliOf } from "../shared/types.js";
/** Host-issued child identities shared by the native main view and Worker management. */
export class HarnessBindingRegistry {
    bindings = new Map();
    listeners = new Set();
    snapshot = [];
    get = (sessionId) => this.bindings.get(sessionId);
    getSnapshot = () => this.snapshot;
    subscribe = (listener) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    publish(binding, worker) {
        if (!binding.sessionId || binding.sessionId === binding.parentSessionId)
            throw new Error('不能把主会话登记为 CLI 子会话');
        const cliSelection = worker?.preference
            ? {
                cli: cliOf(worker.preference),
                model: worker.preference.model,
                effort: worker.preference.effort,
                observedModel: worker.observedModel,
            }
            : this.bindings.get(binding.sessionId)?.cliSelection;
        const workerId = worker?.id ?? this.bindings.get(binding.sessionId)?.workerId;
        const next = { ...binding, ...(workerId ? { workerId } : {}), ...(cliSelection ? { cliSelection } : {}) };
        if (JSON.stringify(this.bindings.get(binding.sessionId)) === JSON.stringify(next))
            return;
        this.bindings.set(binding.sessionId, next);
        this.snapshot = [...this.bindings.values()];
        for (const listener of this.listeners)
            listener();
    }
    clear() {
        this.bindings.clear();
        this.snapshot = [];
        for (const listener of this.listeners)
            listener();
    }
}
export function useHarnessSessionBinding(registry, sessionId) {
    return useSyncExternalStore(registry.subscribe, () => registry.get(sessionId));
}
//# sourceMappingURL=harness-binding-registry.js.map