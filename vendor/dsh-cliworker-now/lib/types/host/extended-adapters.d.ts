import type { CliId, Preference, TaskMode, ModelChoice } from '../shared/types.ts';
import type { RuntimeConfig } from './process.ts';
import { type PiOmpMetadataCapture } from './pi-omp-adapter.ts';
import type { HermesRenewalContext } from './hermes-renewal.ts';
export declare const EXTENDED_CLIS: readonly ["zcode", "grok", "omp", "pi", "hermes", "opencode"];
export declare const isExtendedCli: (cli: string) => cli is (typeof EXTENDED_CLIS)[number];
export declare function privateDirectory(path: string): string;
/**
 * Run only after the native process range has exited. Copies can preserve public
 * modes despite umask. Pin each inode before changing it, skip symlinks, and fail
 * closed on hard links rather than chmod a possibly external file.
 */
export declare function sealPrivateTree(root: string): void;
/** Compatibility only: Host credential references never supply CLI accounts. */
export declare function credentialEnvironment(_cli: CliId, _config: RuntimeConfig, _selectedModel?: string): Promise<Record<string, string>>;
export declare function extendedLaunch(cli: CliId, executable: string, project: string, preference: Preference, mode: TaskMode, prompt: string, stateDirectory: string, config: RuntimeConfig, conversationId?: string, metadataCapture?: PiOmpMetadataCapture, renewal?: HermesRenewalContext, nativeTransport?: boolean): Promise<{
    cleanup: () => Promise<void>;
    answerApproval?: ((id: string, decision: import("./native-approval-policy.ts").NativeApprovalDecision) => Promise<void>) | undefined;
    stop?: (() => Promise<void>) | undefined;
    steer?: ((message: string, requestId: string, signal?: AbortSignal) => Promise<void>) | undefined;
    activate?: (() => Promise<void>) | undefined;
    argv: string[];
    env: {
        ELECTRON_RUN_AS_NODE: string;
        TMPDIR?: string | undefined;
        TMP?: string | undefined;
        TEMP?: string | undefined;
    } | {
        ELECTRON_RUN_AS_NODE: string;
        TMPDIR?: string | undefined;
        TMP?: string | undefined;
        TEMP?: string | undefined;
    } | {
        ELECTRON_RUN_AS_NODE: string;
        TMPDIR: string;
        TMP?: string | undefined;
        TEMP?: string | undefined;
        ZCODE_DATA_BASE_DIR: string;
        ZCODE_STORAGE_DIR: string;
        ZCODE_SESSION_DB_PATH: string;
        ZCODE_LOG_DIR: string;
        ZCODE_PERSONAL_PROVIDER_CONFIG_FILE: string;
        ZCODE_BUILTIN_PROVIDER_CONFIG_FILE: string;
        ZCODE_CREDENTIAL_SECRET?: string | undefined;
    };
}>;
export declare function extendedCatalog(cli: CliId, executable: string, capture: (argv: string[], env?: Record<string, string>) => Promise<string>, stateDirectory: string, config: RuntimeConfig, signal?: AbortSignal, renewal?: HermesRenewalContext): Promise<ModelChoice[]>;
