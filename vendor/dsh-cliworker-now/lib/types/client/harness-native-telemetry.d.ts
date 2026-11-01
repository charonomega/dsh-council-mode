import type { Context } from '@deepseek-ai/cordis';
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import type { HarnessBindingRegistry, HarnessNativeBinding } from './harness-binding-registry.ts';
import type { API } from './workers.ts';
import { type NativeTelemetryProjections } from './harness-telemetry-data.ts';
/** Compatibility type for the explicit local DSH extension, not a fallback renderer. */
export type HarnessProjectionSources = {
    [K in keyof NativeTelemetryProjections]: HostObservable<NativeTelemetryProjections[K]>;
};
export interface HarnessNativeTelemetry {
    attach(reference: SessionReference, binding: HarnessNativeBinding): () => void;
    dispose(): void;
}
/** One Gateway watch per exact Client generation; native rendering consumes bare session sources. */
export declare function installHarnessNativeTelemetry(ctx: Pick<Context, 'uiSession'>, bindings: HarnessBindingRegistry, api: API): HarnessNativeTelemetry;
