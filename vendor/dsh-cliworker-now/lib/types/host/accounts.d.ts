import { ProcessCleanupUnconfirmedError, type ProcessBackend, type RuntimeConfig } from './process.ts';
import { type CliId } from '../shared/types.ts';
import type { AccountAction, AccountFrame, AccountSource, AccountStatus, ZCodeLoginProvider } from '../shared/accounts.ts';
import { type AccountIdentitySource } from './account-identity.ts';
/** User-only auth processes. Only allowlisted identity metadata leaves the Host. */
export declare class AccountManager {
    private backend;
    private config;
    private identity;
    private onQueryCleanup?;
    private readonly sessions;
    private readonly reserved;
    private readonly unsafeQueries;
    private readonly unsafeTerminals;
    private readonly statusQueries;
    private readonly pending;
    private readonly parents;
    private readonly parentClosings;
    private readonly controller;
    private closing?;
    constructor(backend: ProcessBackend, config: RuntimeConfig, identity?: AccountIdentitySource, onQueryCleanup?: ((cli: CliId, error: ProcessCleanupUnconfirmedError) => void) | undefined);
    isBusy(cli: CliId): boolean;
    status(cli: CliId, cwd: string, signal: AbortSignal): Promise<AccountStatus>;
    private readStatus;
    private hasCustomExecutable;
    start(parent: string, cli: CliId, action: AccountAction, cwd: string, signal: AbortSignal, source?: AccountSource, provider?: ZCodeLoginProvider): Promise<{
        id: string;
        instruction: string;
    }>;
    private startSession;
    private readTerminal;
    private emit;
    private owned;
    watch(parent: string, id: string, signal: AbortSignal): AsyncIterable<AccountFrame>;
    write(parent: string, id: string, data: string): Promise<void>;
    resize(parent: string, id: string, cols: number, rows: number): Promise<void>;
    stop(parent: string, id: string): Promise<void>;
    /** Close one Agent lifetime, including startup; a later Agent with the same ID gets a fresh scope. */
    closeParent(parent: string): Promise<void>;
    private finish;
    private track;
    close(): Promise<void>;
}
