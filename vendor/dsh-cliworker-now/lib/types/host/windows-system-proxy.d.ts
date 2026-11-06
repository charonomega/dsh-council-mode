import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
/** The Internet Options proxy (WinINET) as an HTTP proxy URL plus hosts it skips. */
export interface WindowsSystemProxy {
    url: string;
    bypass: string[];
}
/** `reg query` output to a proxy, or undefined when the switch is off or the value is not one HTTP proxy. */
export declare function parseInternetSettings(output: string): WindowsSystemProxy | undefined;
/** Whether the inherited or explicit environment already decides proxying, including an explicit removal. */
export declare function decidesProxy(...envs: (NodeJS.ProcessEnv | undefined)[]): boolean;
/** The variables a CLI reads on macOS from launchd; Windows keys are case-insensitive, so one spelling each. */
export declare function proxyEnvironment(proxy: WindowsSystemProxy, inherited?: NodeJS.ProcessEnv): Record<string, string>;
/** The proxy URL for one Host request, under the same rules as a CLI the Host starts. */
export declare function hostProxyLookup(source: WindowsSystemProxySource): (target: string) => Promise<string | undefined>;
/** Reads the switch on demand; a proxy turned off or changed applies to CLIs started afterwards. */
export declare class WindowsSystemProxySource {
    private readonly spawn;
    private readonly ttlMs;
    private readonly now;
    private value?;
    private readAt;
    private pending?;
    constructor(spawn: (spec: SubprocessSpawnSpec) => SubprocessHandle, ttlMs?: number, now?: () => number);
    /** The last reading, refreshing in the background when stale; for spawns that cannot wait. */
    current(): WindowsSystemProxy | undefined;
    /** A reading no older than the TTL. */
    fresh(): Promise<WindowsSystemProxy | undefined>;
    refresh(): Promise<void>;
    private stale;
    private read;
}
