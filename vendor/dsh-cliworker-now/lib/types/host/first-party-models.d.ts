import { type ModelChoice } from '../shared/types.ts';
import { probeAccountModels, type AccountModelInput } from './account-models.mjs';
export { MimoConfigurationError } from './mimo-configuration.ts';
type Capture = (argv: string[], env?: Record<string, string>) => Promise<string>;
/** Private material only. Never return this structure through Gateway or persist it. */
export interface FirstPartyModelSource extends AccountModelInput {
    sourceIds: string[];
    claudeRoute?: 'proxy' | 'api';
    nativeFullModelIds?: boolean;
    /** Claude-only explicit native route declarations, never account entitlement evidence. */
    claudeConfiguredModels?: boolean;
    modelEnvironment?: Record<string, string>;
    model?: string;
    nativeModels: {
        remoteId: string;
        choice: ModelChoice;
    }[];
}
export declare function readFirstPartyJson(path: string): Promise<Record<string, any>>;
/** Current Claude native managed-file location; Windows no longer reads ProgramData. */
export declare function claudeManagedSettingsPath(platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv): string;
/** Disable inherited SDK credentials and cross-CLI plugin imports in the native MiMo provider resolver. */
export declare function firstPartyEnvironment(cli: string): Record<string, string>;
export declare function assertFirstPartyConfiguration(cli: string, project: string, signal: AbortSignal): Promise<void>;
export declare function parseKimiModelSources(raw: unknown, sourceId: string): FirstPartyModelSource[];
/** MiMo's verbose records are capability metadata, not an account allow-list. */
export declare function parseMimoModelRecords(output: string): Record<string, any>[];
export declare function mimoModelSources(raw: Record<string, any>[], config: Record<string, any>, auth: Record<string, any>, sourceId: string, ownInline?: Record<string, {
    key: string;
    sourceId: string;
}>): FirstPartyModelSource[];
export declare function readFirstPartyModelSources(cli: 'kimi' | 'claude' | 'mimo', executable: string, project: string, capture: Capture, signal: AbortSignal): Promise<FirstPartyModelSource[]>;
export declare function discoverFirstPartySources(sources: FirstPartyModelSource[], signal: AbortSignal, options?: Parameters<typeof probeAccountModels>[1]): Promise<ModelChoice[]>;
