import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CLI_IDS } from "../shared/types.js";
export const CROSS_ACCOUNT_RESUME = Object.fromEntries(CLI_IDS.map((cli) => [cli, 'try']));
export const crossAccountResume = (cli) => CROSS_ACCOUNT_RESUME[cli];
/**
 * Local presence check without reading session content or calling a model.
 * `false` means the native session is certainly absent from the store the
 * next launch uses; `undefined` means unknown, so native resume is attempted.
 */
export function nativeSessionReachable(input) {
    // Oneshot Hermes keeps sessions in its account HERMES_HOME; the native HTTP
    // transport keeps them in the task's own private home instead.
    if (input.cli === 'hermes' && input.transport !== 'hermes-http-v1' && input.hermesHome)
        return existsSync(join(input.hermesHome, 'state.db')) ? undefined : false;
    return undefined;
}
//# sourceMappingURL=cross-account-resume.js.map