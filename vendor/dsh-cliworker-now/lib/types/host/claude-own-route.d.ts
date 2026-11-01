import { type AccountIdentity } from './account-identity.ts';
import { type FirstPartyModelSource } from './first-party-models.ts';
/** Only this Claude child is changed; inherited credentials are never account evidence. */
export declare function claudeLaunchEnvironment(): Record<string, string>;
export declare function claudeRemoteModelId(value: string): string;
/** Exact settings IDs only. Labels and capability metadata never invent a model. */
export declare function claudeConfiguredModels(env: Record<string, unknown>, settingsModel?: unknown): FirstPartyModelSource['nativeModels'];
/** Public errors never interpolate native configuration or credentials. */
export declare class ClaudeOwnRouteError extends Error {
    readonly code = "CLI_OWN_ACCOUNT_REQUIRED";
    constructor(message?: string);
}
export interface ClaudeOwnRoute {
    kind: 'native' | 'proxy' | 'api';
    sourceIds: string[];
    configDirectory?: string;
    /** Host-only current model configuration; included in admission and launch snapshots. */
    modelEnvironment?: Record<string, string>;
    model?: string;
    /** Field names only, with empty values; native operations suppress own route overrides. */
    suppressedEnvironment?: Record<string, string>;
    /** Host-only; never project this material to Gateway. */
    source?: FirstPartyModelSource;
}
/** Verified on native 2.1.296: empty settings.env unsets provider selectors for this process. */
export declare function claudeNativeSettingsArguments(configDirectory?: string, suppressedEnvironment?: Record<string, string>): string[];
/** TCP only: a listening proxy remains selected even if its HTTP authentication fails. */
export declare function claudeLoopbackAvailable(url: URL, signal: AbortSignal): Promise<boolean>;
/** Official account operations never probe or require an API/proxy route. */
export declare function readClaudeOfficialAccountRoute(project: string, signal: AbortSignal): Promise<ClaudeOwnRoute>;
export declare function readClaudeOwnRoute(project: string, signal: AbortSignal, options?: {
    available?: typeof claudeLoopbackAvailable;
}): Promise<ClaudeOwnRoute>;
export declare function claudeRouteStatusArguments(executable: string, route: ClaudeOwnRoute): string[];
export declare function claudeRouteIdentity(route: ClaudeOwnRoute, raw: string, exitCode: number | null): AccountIdentity;
/** Pin one route before spawning; secrets are in a private temporary file, never argv. */
export declare function prepareClaudeWorkerLaunch(route: ClaudeOwnRoute, argv: string[], stateDirectory: string, signal: AbortSignal): Promise<{
    argv: string[];
    env: Record<string, string>;
    cleanup?: undefined;
} | {
    argv: string[];
    env: Record<string, string>;
    cleanup: () => Promise<void>;
}>;
