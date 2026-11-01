import { nativeTelemetryFromSnapshot, nativeTelemetryProjections, } from "./harness-telemetry-data.js";
import { telemetryAvailability } from "../shared/native-request-state.js";
const EMPTY = nativeTelemetryProjections('harness');
const keys = ['tokenUsage', 'contextPressure', 'contextBreakdown', 'externalTurnUsage', 'externalTurnAnswer', 'telemetryAvailability', 'externalRequestState'];
function observable(initial) {
    let value = initial;
    const listeners = new Set();
    return {
        getSnapshot: () => value,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        set(next) {
            if (JSON.stringify(value) === JSON.stringify(next))
                return;
            value = next;
            for (const listener of listeners)
                listener();
        },
        clear() { listeners.clear(); },
    };
}
function sameOwner(left, right) {
    return !!left && !!right.workerId && left.workerId === right.workerId &&
        left.sessionId === right.sessionId && left.parentSessionId === right.parentSessionId &&
        left.mode === right.mode && right.mode === 'continuable' && right.sessionId !== right.parentSessionId;
}
/** Keep only exact previously bound Turn identities after their source disconnects. */
function unavailableTurns(previous) {
    if (!previous || typeof previous !== 'object' || Array.isArray(previous))
        return undefined;
    return Object.fromEntries(Object.entries(previous).map(([turn, value]) => [turn,
        value && 'usageUnit' in value && value.usageUnit === 'credits'
            ? { basis: 'external-run', runIds: value.runIds, usageUnit: 'credits' } : null]));
}
/** One Gateway watch per exact Client generation; native rendering consumes bare session sources. */
export function installHarnessNativeTelemetry(ctx, bindings, api) {
    const entries = new Map();
    let disposed = false;
    const unsubscribe = bindings.subscribe(() => {
        for (const entry of entries.values())
            if (!sameOwner(bindings.get(entry.owner.sessionId), entry.owner))
                entry.invalidate();
    });
    return {
        attach(reference, binding) {
            if (disposed)
                throw new Error('CLI 会话统计桥已卸载');
            const generation = reference.binding;
            if (reference.sessionId !== binding.sessionId || generation.sessionId !== binding.sessionId ||
                !sameOwner(bindings.get(binding.sessionId), binding))
                throw new Error('CLI 统计绑定与原生子会话引用不一致');
            let entry = entries.get(generation);
            if (entry && !sameOwner(entry.owner, binding))
                throw new Error('原生会话已有其他 Worker 的统计来源');
            if (!entry) {
                const provider = ctx.uiSession;
                if (typeof provider.provideProjections !== 'function')
                    throw new Error('当前宿主缺少原生会话统计数据接口，请更新宿主后重新打开。');
                const sources = {
                    telemetryAvailability: observable(telemetryAvailability(true)),
                    externalRequestState: observable(EMPTY.externalRequestState),
                    tokenUsage: observable(EMPTY.tokenUsage),
                    contextPressure: observable(EMPTY.contextPressure),
                    contextBreakdown: observable(EMPTY.contextBreakdown),
                    externalTurnUsage: observable(EMPTY.externalTurnUsage),
                    externalTurnAnswer: observable(EMPTY.externalTurnAnswer),
                };
                const publish = (values) => {
                    for (const key of keys)
                        sources[key].set(values[key]);
                };
                let stopStream = () => { };
                let releaseGeneration;
                // Undefined masks transcript estimates for the three session sources.
                // For turn totals it preserves native, fully attributed response usage.
                const releaseProvider = provider.provideProjections(reference, sources);
                const created = {
                    owner: { ...binding }, generation, references: 0, closed: false, watching: true,
                    invalidate() {
                        // A disconnected bound Turn must not fall back to native request
                        // accounting. Clear every number, retaining only its unknown marker
                        // while this exact owner and generation still hold the source.
                        const externalTurnUsage = !created.closed && sameOwner(bindings.get(created.owner.sessionId), created.owner)
                            ? unavailableTurns(sources.externalTurnUsage.getSnapshot()) : undefined;
                        const usageUnit = !created.closed && sameOwner(bindings.get(created.owner.sessionId), created.owner)
                            ? sources.telemetryAvailability.getSnapshot()?.usageUnit : undefined;
                        publish({ ...EMPTY, externalTurnUsage, telemetryAvailability: {
                                ...telemetryAvailability(false, true), ...(usageUnit ? { usageUnit } : {}),
                            } });
                        if (!created.watching)
                            return;
                        created.watching = false;
                        stopStream();
                    },
                    close() {
                        if (created.closed)
                            return;
                        created.closed = true;
                        created.invalidate();
                        if (entries.get(generation) === created)
                            entries.delete(generation);
                        releaseProvider();
                        for (const key of keys)
                            sources[key].clear();
                        void Promise.resolve(releaseGeneration?.()).catch(() => undefined);
                    },
                };
                entries.set(generation, created);
                try {
                    releaseGeneration = generation.ctx.effect(() => () => created.close());
                    const stream = api.$stream({
                        name: `CLI Worker statistics ${binding.parentSessionId}/${binding.workerId}`,
                        open: (signal) => api.cliworker.watch(binding.parentSessionId, binding.workerId, signal),
                        ended: () => new Error('CLI 统计连接已结束'),
                    });
                    let streamDisposed = false;
                    stopStream = () => {
                        if (streamDisposed)
                            return;
                        streamDisposed = true;
                        void stream.dispose().catch(() => undefined);
                    };
                    if (!created.watching)
                        stopStream();
                    void (async () => {
                        try {
                            for await (const item of stream) {
                                if (!created.watching || created.closed)
                                    break;
                                if (!sameOwner(bindings.get(binding.sessionId), created.owner))
                                    throw new Error('CLI 统计归属已变化');
                                const snapshot = JSON.parse(item.value);
                                const observed = nativeTelemetryFromSnapshot(created.owner, snapshot);
                                if (!observed)
                                    throw new Error('CLI 统计回执与当前 Worker 不一致');
                                publish(nativeTelemetryProjections(observed.cli, observed.telemetry, observed.externalTurnUsage, observed.activeRunId, observed.lifecycle));
                                item.accept();
                            }
                        }
                        catch {
                            // Unknown is a value supplied to the native contract, not a
                            // request to fall back to another Agent's projection.
                        }
                        finally {
                            created.invalidate();
                        }
                    })();
                }
                catch (error) {
                    created.close();
                    throw error;
                }
                entry = created;
            }
            entry.references++;
            const held = entry;
            let released = false;
            return () => {
                if (released)
                    return;
                released = true;
                if (--held.references === 0)
                    held.close();
            };
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            unsubscribe();
            for (const entry of [...entries.values()])
                entry.close();
        },
    };
}
//# sourceMappingURL=harness-native-telemetry.js.map