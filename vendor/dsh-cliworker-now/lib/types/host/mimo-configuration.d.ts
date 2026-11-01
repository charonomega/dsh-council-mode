import type { AccountIdentity } from './account-identity.ts';
export declare class MimoConfigurationError extends Error {
    constructor(message: string);
}
/** Mirrors native Global.Path; arbitrary config/content/DB selectors are cleared in the child. */
export declare function mimoConfigurationPaths(options?: {
    env?: NodeJS.ProcessEnv;
    osHome?: string;
    paths?: Pick<typeof import('node:path'), 'join' | 'isAbsolute'>;
}): {
    home: string;
    config: string;
    data: string;
};
export declare function mimoConfigurationFiles(project: string): Promise<string[]>;
/** Auth.Service reads this file independently of model/project configuration. */
export declare function readMimoOwnAuth(signal: AbortSignal): Promise<Record<string, any>>;
export declare function readMimoAccount(signal: AbortSignal): Promise<AccountIdentity>;
/** Only unavoidable external inputs remain relevant in an isolated account terminal. */
export declare function assertMimoAccountConfiguration(signal: AbortSignal): Promise<void>;
/** Native Config.Service expands references before returning metadata, so inspect before spawning it. */
export declare function assertMimoConfiguration(project: string, signal: AbortSignal): Promise<void>;
