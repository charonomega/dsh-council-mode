import type { HarnessBindingRegistry } from './harness-binding-registry.ts';
export declare function harnessGoalEditor(bindings: HarnessBindingRegistry): {
    requests: Map<string, number>;
    listeners: Set<() => void>;
};
export declare function openHarnessWorkerGoal(bindings: HarnessBindingRegistry, sessionId: string): void;
