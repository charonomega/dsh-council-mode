import { type QoderCliId } from './qoder-variant.ts';
import { type WindowsPathOptions } from './windows-cli-path.ts';
import type { CliId } from '../shared/types.ts';
export declare class WindowsCliInstallationError extends Error {
    readonly installed: boolean;
    readonly code = "CLI_INSTALLATION_UNAVAILABLE";
    constructor(message: string, installed?: boolean);
}
/** A completed desktop/PATH search found no CLI; absence is not a broken installation. */
export declare class WindowsCliNotFoundError extends WindowsCliInstallationError {
    constructor(cli: 'zcode' | 'opencode' | QoderCliId);
}
type WindowsEnvironment = WindowsPathOptions;
export type WindowsDiscoverableCli = Exclude<CliId, 'harness'>;
export declare function windowsCliCommands(cli: WindowsDiscoverableCli): string[];
/** Declarative installer hints precede shared user bins; no directory enumeration or version guessing. */
export declare function windowsCliCandidates(cli: WindowsDiscoverableCli, options?: WindowsEnvironment): string[];
/** A residue is not a runnable installation and is not evidence of an account. */
export declare function hasWindowsHermesInstallDirectory(options?: WindowsEnvironment): boolean;
/** Validate an automatically discovered npm shim against Codex's own package, not just its name. */
export declare function validateWindowsCodexNpmEntry(path: string): string;
/** Qoder's qoder alias is a dispatcher; prefer the package's actual qodercli bin. */
export declare function validateWindowsQoderNpmEntry(path: string, cli?: QoderCliId): string;
/** Manual wrappers remain supported, but known opposite-brand entries cannot borrow another account. */
export declare function rejectWindowsQoderCrossVariant(executable: string, cli: QoderCliId): void;
/** Automatic hints must identify the standalone CLI, never an IDE or dispatcher. */
export declare function windowsQoderCliEntry(executable: string, cli?: QoderCliId): string;
export declare function presentWindowsCliCandidate(cli: WindowsDiscoverableCli, options?: WindowsEnvironment): string | undefined;
/** Validate the same entry rules for fixed bins and freshly read PATH. */
export declare function validateWindowsCliCandidate(cli: WindowsDiscoverableCli, path: string): string;
/** Query current-user registered packages, never guess the newest WindowsApps directory. */
export declare const CODEX_APPX_QUERY = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $p=@(Get-AppxPackage -Name 'OpenAI.Codex'); if($p.Count -eq 0){'null';exit 0}; if($p.Count -ne 1){throw 'Ambiguous Codex package'}; $v=$p[0]; [ordered]@{name=$v.Name;family=$v.PackageFamilyName;fullName=$v.PackageFullName;publisher=$v.Publisher;signature=[string]$v.SignatureKind;status=[string]$v.Status;location=$v.InstallLocation}|ConvertTo-Json -Compress";
export interface CodexAppxRecord {
    name: string;
    family: string;
    fullName: string;
    publisher: string;
    signature: string;
    status: string;
    location: string;
}
/** Exported separately for synthetic identity/relocation tests; no process or account access. */
export declare function codexAppxExecutable(raw: string, validateFile?: (path: string) => string): string | undefined;
export declare function findWindowsCodexAppx(capture: (argv: string[], cwd: string) => Promise<string>, signal: AbortSignal, env?: NodeJS.ProcessEnv): Promise<string | undefined>;
export {};
