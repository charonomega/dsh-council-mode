export interface WindowsCodexLaunch {
    argv: string[];
    env: NodeJS.ProcessEnv;
}
/** A background-only optimization. It never changes the saved installation entry or the caller's env. */
export declare function windowsCodexBackgroundLaunch(argv: readonly string[], env?: NodeJS.ProcessEnv, options?: {
    platform?: NodeJS.Platform;
    arch?: string;
}): WindowsCodexLaunch | undefined;
