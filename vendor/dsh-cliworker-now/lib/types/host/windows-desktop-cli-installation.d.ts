import { type PlatformPath } from 'node:path';
export type WindowsDesktopCli = 'zcode' | 'opencode';
/** Fixed OS metadata query only. No installer, shortcut target, or user command is executed. */
export declare const WINDOWS_DESKTOP_INSTALL_QUERY: string;
interface FileQueries {
    ordinaryFile(path: string): string | undefined;
    directory(path: string): string | undefined;
    peFile(path: string): string | undefined;
}
export interface WindowsDesktopOptions {
    /** For explicit synthetic fixture paths only; production always uses win32. */
    path?: PlatformPath;
    files?: FileQueries;
}
/** Metadata is a bounded hint, never a command or an account source. */
export declare function windowsDesktopCliFromMetadata(cli: WindowsDesktopCli, raw: string, options?: WindowsDesktopOptions): string | undefined;
export declare function findWindowsDesktopCli(cli: WindowsDesktopCli, capture: (argv: string[], cwd: string) => Promise<string>, signal: AbortSignal, env?: NodeJS.ProcessEnv): Promise<string | undefined>;
/** Do not treat a PATH/explicit Desktop GUI as the command-line binary. */
export declare function windowsOpenCodeDesktopCli(executable: string, explicit?: boolean, options?: WindowsDesktopOptions): string | undefined;
export {};
