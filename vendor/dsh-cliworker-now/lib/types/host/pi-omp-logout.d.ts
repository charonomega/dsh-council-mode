import type { PiOmpAccountTerminalInput, PiOmpAccountTerminalLaunch } from './pi-omp-accounts.ts';
/** No snapshot, migration or credential deletion here: only native user-operated menus. */
export declare function preparePiOmpLogout(input: PiOmpAccountTerminalInput): Promise<PiOmpAccountTerminalLaunch>;
