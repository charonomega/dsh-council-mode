export declare class HermesExecutableError extends Error {
}
export declare function hermesCommandInstallationHome(argv: string[]): string | undefined;
/** Reuse the current official checkout's committed dependency environment, not a
 * directory selected by recency/hash guessing. A clean account home must not run
 * the installer's borrowed-home sync. Older/self-contained entries retain their
 * native launcher contract. The child rechecks this selection under its native lock. */
export declare function hermesNativeCommand(executable: string, args: string[], signal?: AbortSignal): Promise<string[]>;
/** Inspect the installed fixed exec shim without invoking its installer or auth UI. */
export declare function verifyHermesExecutable(executable: string, signal: AbortSignal): Promise<void>;
