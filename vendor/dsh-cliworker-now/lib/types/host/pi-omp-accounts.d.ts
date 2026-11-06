import type { AccountAction, AccountSource } from '../shared/accounts.ts';
import type { PiOmpCli } from './pi-omp-adapter.ts';
import { type RuntimeConfig } from './process.ts';
export interface PiOmpAccountTerminalInput {
    cli: PiOmpCli;
    action?: AccountAction;
    source?: AccountSource;
    /** A provider picked in the account window (login). */
    provider?: string;
    /** One login of the account window to sign out (`AccountLogin.id`). */
    login?: string;
    executable: string;
    project: string;
    stateDirectory: string;
    /** Read-only native source override for isolated integrations/tests. */
    nativeHome?: string;
    config: RuntimeConfig;
    signal?: AbortSignal;
}
export interface PiOmpAccountTerminalLaunch {
    argv: string[];
    cwd: string;
    env: Record<string, string>;
    instruction: string;
    /** Call only after the complete terminal process range has exited. */
    cleanup: () => Promise<void>;
}
/**
 * User-operated native account UI. No task prompt or automatic login is sent;
 * original global sources remain unchanged and this plugin keeps its own account store.
 */
export declare function preparePiOmpAccountTerminal(input: PiOmpAccountTerminalInput): Promise<PiOmpAccountTerminalLaunch>;
