import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
/** Harness rc.2 ui-chat presentation-policy; its complete component is not exported. */
const policies = {
    compact: {
        mode: 'compact',
        foldCompletedTurns: true,
        stepGrouping: 'collapsed',
        liveProcessDetail: false,
        settledReasoningPreview: false,
    },
    standard: {
        mode: 'standard',
        foldCompletedTurns: true,
        stepGrouping: 'collapsed',
        liveProcessDetail: true,
        settledReasoningPreview: true,
    },
    detailed: {
        mode: 'detailed',
        foldCompletedTurns: true,
        stepGrouping: 'history',
        liveProcessDetail: true,
        settledReasoningPreview: true,
    },
    verbose: {
        mode: 'verbose',
        foldCompletedTurns: false,
        stepGrouping: 'none',
        liveProcessDetail: false,
        settledReasoningPreview: true,
    },
};
export function workDetailsPolicy(value, desktop = 'dshDesktop' in globalThis) {
    if (value === 'normal' || value === 'expanded')
        return policies.detailed;
    return policies[value === 'compact' || value === 'standard' || value === 'detailed' || value === 'verbose'
        ? value
        : desktop
            ? 'standard'
            : 'compact'];
}
const Presentation = createContext(undefined);
/** Only the global presentation preference is read, never a parent Session projection. */
export function NativePresentationProvider({ source, children, }) {
    const observe = useMemo(() => ({
        read: () => source.getSnapshot(),
        subscribe: (listener) => source.subscribe(listener),
    }), [source]);
    const snapshot = useSyncExternalStore(observe.subscribe, observe.read, observe.read);
    return (_jsx(Presentation.Provider, { value: workDetailsPolicy(snapshot.value?.transcriptView), children: children }));
}
export const useNativePresentation = () => useContext(Presentation) ?? workDetailsPolicy(undefined);
//# sourceMappingURL=native-presentation.js.map