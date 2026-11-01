import type { Context } from '@deepseek-ai/cordis';
import type { HarnessBindingRegistry } from './harness-binding-registry.ts';
/** All native Conversation occurrences share this public composer seat.
 * The shipped runtime's commandSource owner prop selects the existing menu
 * controller; ordinary Sessions keep their original source and injection. */
export declare function installHarnessNativeCommandMenu(ctx: Pick<Context, 'slots'>, bindings: HarnessBindingRegistry): () => void;
