import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useHarnessSessionBinding } from "./harness-binding-registry.js";
import { harnessComposerBlock, retainHarnessComposerBlock } from "./harness-conversation.js";
import { installHarnessSessionDomGuard } from "./harness-dom-guard.js";
import { HarnessNativeTooltips } from "./harness-native-tooltip.js";
import { useWorkers } from "./workers.js";
export function HarnessNativeSessionSupports({ bindings, conversation, forks, api, }) {
    const known = useSyncExternalStore(bindings.subscribe, bindings.getSnapshot);
    return (_jsx(_Fragment, { children: known.map((binding) => (_jsx(HarnessNativeSessionSupport, { sessionId: binding.sessionId, bindings: bindings, conversation: conversation, forks: forks, api: api }, binding.sessionId))) }));
}
/** Capability support for an exact Host-issued child; it owns no native UI or navigation. */
export function HarnessNativeSessionSupport({ sessionId, bindings, conversation, forks, api, }) {
    const binding = useHarnessSessionBinding(bindings, sessionId);
    const forkRevision = useSyncExternalStore(forks?.subscribe ?? noSubscribe, forks?.getSnapshot ?? noRevision);
    const [targets, setTargets] = useState([]);
    useLayoutEffect(() => {
        if (!binding)
            return;
        return retainHarnessComposerBlock(conversation, sessionId, harnessComposerBlock(binding));
    }, [binding, conversation, sessionId]);
    useLayoutEffect(() => {
        setTargets([]);
        if (!binding || typeof document === 'undefined')
            return;
        const cut = (button) => {
            const turn = button.closest('[data-turn-tail]')?.getAttribute('data-turn-tail');
            return turn == null ? { atMessageId: '', reason: '只能从已完成的助手轮次分支' } : forks.cut(sessionId, { turn: Number(turn) });
        };
        return installHarnessSessionDomGuard(document, binding, (next) => setTargets((previous) => previous.length === next.length &&
            previous.every((target, index) => target.element === next[index]?.element && target.reason === next[index]?.reason)
            ? previous
            : next), forks ? {
            reason: (button) => forks.reason(sessionId, cut(button)),
            fork: (button) => { void forks.fork(sessionId, cut(button)); },
        } : undefined);
    }, [binding, forks, forkRevision]);
    return _jsxs(_Fragment, { children: [api && forks && binding?.workerId && _jsx(ForkWorkerState, { api: api, forks: forks, binding: binding }), _jsx(HarnessNativeTooltips, { targets: targets })] });
}
const noSubscribe = () => () => { };
const noRevision = () => 0;
function ForkWorkerState({ api, forks, binding }) {
    const { snapshot } = useWorkers(api, binding.parentSessionId, binding.workerId);
    useLayoutEffect(() => { forks.update(binding.sessionId, snapshot); }, [forks, binding.sessionId, snapshot]);
    return null;
}
//# sourceMappingURL=harness-native-session-support.js.map