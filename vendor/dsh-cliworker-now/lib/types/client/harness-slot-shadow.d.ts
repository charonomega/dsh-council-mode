import type { Context } from '@deepseek-ai/cordis';
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots';
/** Borrow a native cell's metadata, leaving its child declarations with the owner. */
export declare function shadowHarnessSlot(slots: Context['slots'], name: Parameters<Context['slots']['entries']>[0], id: string | undefined, replace: (original: StoredEntry) => Pick<StoredEntry, 'component' | 'inject'>): () => void;
