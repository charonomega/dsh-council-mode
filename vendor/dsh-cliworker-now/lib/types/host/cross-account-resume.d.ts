import { type CliId } from '../shared/types.ts';
/**
 * How an existing task continues after its account changed:
 * `native` (confirmed) and `try` (untested) resume the native session and fall
 * back to a carryover when that fails before any event; `carryover` skips the
 * native attempt and starts a new session with the plugin's own history. Entries change only after a
 * real-account experiment (OpenSpec continue-tasks-across-account-changes §0).
 */
export type CrossAccountResume = 'native' | 'carryover' | 'try';
export declare const CROSS_ACCOUNT_RESUME: Readonly<Record<CliId, CrossAccountResume>>;
export declare const crossAccountResume: (cli: CliId) => CrossAccountResume;
/**
 * Local presence check without reading session content or calling a model.
 * `false` means the native session is certainly absent from the store the
 * next launch uses; `undefined` means unknown, so native resume is attempted.
 */
export declare function nativeSessionReachable(input: {
    cli: CliId;
    transport?: string;
    hermesHome?: string;
}): false | undefined;
