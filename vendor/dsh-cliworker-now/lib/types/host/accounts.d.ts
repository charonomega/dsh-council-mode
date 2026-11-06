import { ProcessCleanupUnconfirmedError, type ProcessBackend, type RuntimeConfig } from './process.ts';
import { type CliId } from '../shared/types.ts';
import type { AccountAction, AccountFrame, AccountResponse, AccountSource, AccountStatus } from '../shared/accounts.ts';
import { type AccountIdentitySource } from './account-identity.ts';
/** Guided login window timing; tests shorten it. */
export declare const AGY_GUIDE_TIMING: {
    commandDelayMs: number;
    pollMs: number;
    loginConfirmMs: number;
    logoutConfirmMs: number;
    /** Output pause that counts as a finished draw; agy pauses ~2 s while signing in. */
    quietMs: number;
    /** A screen that keeps animating is still read after this long. */
    settleCapMs: number;
    /** When `/logout` is still pending after this, one more Enter runs a completed slash command. */
    confirmEnterMs: number;
    /** Other CLIs' guided windows: a screen this still with no known step goes to the native terminal. */
    flowQuietMs: number;
    /** How long a waiting browser/device authorization is watched, and how often. */
    authorizeWatchMs: number;
    watchPollMs: number;
};
/** User-only auth processes. Only allowlisted identity metadata leaves the Host. */
export declare class AccountManager {
    private backend;
    private config;
    private identity;
    private onQueryCleanup?;
    private readonly sessions;
    private readonly reserved;
    /** CLIs whose account read left an unconfirmed range, with its display-safe reason. */
    private readonly unsafeQueries;
    private readonly unsafeTerminals;
    private readonly statusQueries;
    private readonly pending;
    private readonly parents;
    private readonly parentClosings;
    private readonly controller;
    private closing?;
    private readonly nativeLoginProviders;
    constructor(backend: ProcessBackend, config: RuntimeConfig, identity?: AccountIdentitySource, onQueryCleanup?: ((cli: CliId, error: ProcessCleanupUnconfirmedError) => void) | undefined);
    isBusy(cli: CliId): boolean;
    /** The paused state a CLI reports while an account process range is unconfirmed. */
    private cleanupHold;
    /** An account read whose process range is unconfirmed holds the CLI until the user releases it. */
    private quarantineQuery;
    /** The user confirmed no account process of this CLI is left; refuse while one is still owned here. */
    assertCleanupRecoverable(cli: CliId): void;
    recoverCleanup(cli: CliId): void;
    status(cli: CliId, cwd: string, signal: AbortSignal): Promise<AccountStatus>;
    /** `renew: false` reads Hermes' own store as it is, for a window that holds off Nous renewal. */
    private readStatus;
    /** The login still exists in the native store: a stale window never signs out something else. */
    private assertLogin;
    private hasCustomExecutable;
    start(parent: string, cli: CliId, action: AccountAction, cwd: string, signal: AbortSignal, source?: AccountSource, provider?: string, login?: string): Promise<{
        id: string;
        instruction: string;
        size: {
            cols: number;
            rows: number;
        };
    }>;
    private startSession;
    private readTerminal;
    private emit;
    private owned;
    watch(parent: string, id: string, signal: AbortSignal): AsyncIterable<AccountFrame>;
    write(parent: string, id: string, data: string): Promise<void>;
    /** The user's answer to the current step of a plugin-drawn window. */
    respond(parent: string, id: string, response: AccountResponse): Promise<void>;
    private guided;
    /** A choice the user already made in the window, typed into the menu it belongs to. */
    private autoWrite;
    /** The native account: agy's own credential store, or this CLI's account status. */
    private evidence;
    /** An ordinary failed read is retried by the caller's poll; an unconfirmed process range ends it. */
    private readEvidence;
    /** Report a proven change, after the native step a login still needs. */
    private proven;
    /** The CLI ended its own login/logout: read the account before reporting the window closed. */
    private guidedExit;
    private settleLater;
    /** A settled screen with no known step: the native account decides whether it is signed in. */
    private identifyScreen;
    /** The sign-out command the plugin types for the user (2026-10-26 request) in a CLI without a logout subcommand. */
    private logOut;
    /** A browser or device authorization the CLI waits for without exiting: read the account until it signs in. */
    private watchAccount;
    /** The native account state, not terminal text, decides that a login or logout took effect. */
    private confirmAccount;
    resize(parent: string, id: string, cols: number, rows: number): Promise<void>;
    stop(parent: string, id: string): Promise<void>;
    /** Close one Agent lifetime, including startup; a later Agent with the same ID gets a fresh scope. */
    closeParent(parent: string): Promise<void>;
    private finish;
    /**
     * A CLI that never reaped a finished helper (agy's browser opener after
     * /login) keeps a zombie descendant, and the macOS provider then refuses to
     * stop the session without signalling the CLI. Ending it first lets the
     * system reap the zombie; terminate() still owns every remaining member.
     */
    private endForeground;
    private track;
    close(): Promise<void>;
}
