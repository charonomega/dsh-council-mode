import type { Context } from '@deepseek-ai/cordis';
import { type HarnessBindingRegistry } from './harness-binding-registry.ts';
import { type API } from './workers.ts';
/** Share one delegating registration per slot registry and exact authority. */
export declare function installHarnessControlGuards(ctx: Pick<Context, 'slots'>, bindings: HarnessBindingRegistry, api?: API): () => void;
