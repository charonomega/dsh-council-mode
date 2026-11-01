import type { CliId, Preference } from '../shared/types.ts';
export interface PreferenceSaveState {
    status: 'idle' | 'draft' | 'saving' | 'saved' | 'failed';
    saving: boolean;
    preference?: Preference;
    error?: string;
}
type Write = (preference: Preference, signal: AbortSignal) => Promise<Preference>;
type Draft = {
    revision: number;
    preference: Preference;
    write: Write;
    saved: (preference: Preference) => void;
};
/** Capture before a metadata request, so an older read cannot erase a later save receipt. */
export declare function preferenceReadVersion(): number;
/** Explicit edits only. Leaving flushes a snapshot; closing does not abort its write. */
export declare class SettingsPreferenceSaves {
    private slots;
    get pending(): boolean;
    clear(): void;
    private slot;
    snapshot(cli: CliId): PreferenceSaveState;
    subscribe(cli: CliId, listener: () => void): () => void;
    private publish;
    stage(preference: Preference, write: Write, saved: Draft['saved']): void;
    flush(cli: CliId): void;
    /** A new source must never receive a draft selected against the previous source. */
    invalidate(cli: CliId): void;
    /** A fresh Host snapshot owns settled defaults; preserve unfinished or failed edits. */
    sync(cli: CliId, readVersion?: number): void;
    private drain;
}
export {};
