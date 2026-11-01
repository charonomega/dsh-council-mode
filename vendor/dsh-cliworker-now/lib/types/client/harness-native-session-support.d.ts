import type { Context } from '@deepseek-ai/cordis';
import { type HarnessBindingRegistry } from './harness-binding-registry.ts';
import { type API } from './workers.ts';
import type { HarnessWorkerFork } from './harness-worker-fork.tsx';
export declare function HarnessNativeSessionSupports({ bindings, conversation, forks, api, }: {
    bindings: HarnessBindingRegistry;
    conversation: Context['conversation'];
    forks?: HarnessWorkerFork;
    api?: API;
}): import("react/jsx-runtime").JSX.Element;
/** Capability support for an exact Host-issued child; it owns no native UI or navigation. */
export declare function HarnessNativeSessionSupport({ sessionId, bindings, conversation, forks, api, }: {
    sessionId: string;
    bindings: HarnessBindingRegistry;
    conversation: Context['conversation'];
    forks?: HarnessWorkerFork;
    api?: API;
}): import("react/jsx-runtime").JSX.Element;
