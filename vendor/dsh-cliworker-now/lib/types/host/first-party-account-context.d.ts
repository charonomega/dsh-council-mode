import type { AccountAction } from '../shared/accounts.ts';
/** Native login keeps the same auth store and a private work directory/database. */
export declare function prepareMimoAccountTerminal(executable: string, action: AccountAction, stateDirectory: string, signal: AbortSignal, options?: {
    platform?: NodeJS.Platform;
}): Promise<{
    argv: string[];
    cwd: string;
    env: {
        MIMOCODE_DISABLE_PROJECT_CONFIG: string;
        MIMOCODE_DISABLE_GIT: string;
        MIMOCODE_MIMO_ONLY: string;
        MIMOCODE_TEST_MANAGED_CONFIG_DIR: string;
        MIMOCODE_TUI_CONFIG: string;
        MIMOCODE_PLUGIN_META_FILE: string;
        MIMOCODE_WORKSPACE_ID: string;
        MIMOCODE_DB: string;
        XDG_DATA_HOME?: string | undefined;
        XDG_CONFIG_HOME?: string | undefined;
        XDG_CACHE_HOME?: string | undefined;
        XDG_STATE_HOME?: string | undefined;
        HOME: string;
        USERPROFILE: string;
        MIMOCODE_HOME: string;
    };
    cleanup: () => Promise<void>;
}>;
