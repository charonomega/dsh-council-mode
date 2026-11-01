import { harnessFeatureReason } from "./harness-feature-support.js";
const editors = new WeakMap();
export function harnessGoalEditor(bindings) {
    let editor = editors.get(bindings);
    if (!editor)
        editors.set(bindings, (editor = { requests: new Map(), listeners: new Set() }));
    return editor;
}
export function openHarnessWorkerGoal(bindings, sessionId) {
    const binding = bindings.get(sessionId);
    if (!binding || harnessFeatureReason(binding, 'goal'))
        return;
    const editor = harnessGoalEditor(bindings);
    editor.requests.set(sessionId, (editor.requests.get(sessionId) ?? 0) + 1);
    editor.listeners.forEach((listener) => listener());
}
//# sourceMappingURL=harness-goal-editor.js.map