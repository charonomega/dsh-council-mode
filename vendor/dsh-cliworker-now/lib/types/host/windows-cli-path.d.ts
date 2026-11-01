export interface WindowsPathOptions {
    home?: string;
    env?: NodeJS.ProcessEnv;
}
/** Common installer bins only. No recursive search, arbitrary drive scan, or version selection. */
export declare function windowsCommonBinDirectories(options?: WindowsPathOptions): string[];
export declare function windowsCommandCandidates(commands: readonly string[], directories: readonly string[], env?: NodeJS.ProcessEnv): string[];
/** PATH cannot admit current-directory, relative, UNC, unresolved-variable, or shell-script lookups. */
export declare function windowsPathDirectories(paths: readonly string[]): string[];
/** A broken present entry is authoritative; only absent files may fall through. */
export declare function firstPresentWindowsPath(candidates: readonly string[]): string | undefined;
export declare const WINDOWS_PATH_QUERY = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $u=[Environment]::GetEnvironmentVariable('Path','User'); $m=[Environment]::GetEnvironmentVariable('Path','Machine'); [ordered]@{user=$(if($null -eq $u){''}else{[Environment]::ExpandEnvironmentVariables($u)});machine=$(if($null -eq $m){''}else{[Environment]::ExpandEnvironmentVariables($m)})}|ConvertTo-Json -Compress";
/** Read latest user/machine PATH after inherited PATH misses. The caller owns capture cleanup and cancellation. */
export declare function findWindowsPathCommand(commands: readonly string[], capture: (argv: string[], cwd: string) => Promise<string>, signal: AbortSignal, options?: WindowsPathOptions): Promise<string | undefined>;
