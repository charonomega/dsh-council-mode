import { type CliId, type ModelChoice, type Preference } from '../shared/types.ts';
import type { AccountStatus } from '../shared/accounts.ts';
import type { SettingsCacheMetadata } from '../shared/settings-cache.ts';
import { SettingsPreferenceSaves } from './settings-preference-saves.ts';
export interface SettingsCatalog {
    cli: CliId;
    models: ModelChoice[];
    preference?: Preference;
    notice?: string;
}
export interface SettingsAccountEntry {
    loading: boolean;
    data?: AccountStatus;
    error?: string;
}
export interface SettingsCatalogEntry {
    loading: boolean;
    data?: SettingsCatalog;
    error?: string;
}
/** An absent capability uses the old Host path; a malformed scope fails closed. */
export declare function settingsCacheMetadata(value: unknown): SettingsCacheMetadata | undefined;
/** Completed display receipts only. No timers, processes, secrets or disk storage. */
export declare class SettingsDisplayCache {
    private metadata;
    readonly preferenceSaves: SettingsPreferenceSaves;
    private accounts;
    private catalogs;
    private generations;
    constructor(metadata: SettingsCacheMetadata);
    sync(metadata: SettingsCacheMetadata, enabled: Record<CliId, boolean>, readVersion?: number): void;
    invalidate(cli: CliId, discardPreference?: boolean): void;
    version(cli: CliId): number;
    accountSnapshot(): Partial<Record<CliId, SettingsAccountEntry>>;
    catalogSnapshot(): Partial<Record<CliId, SettingsCatalogEntry>>;
    account(cli: CliId, entry: SettingsAccountEntry, version?: number): void;
    catalog(cli: CliId, entry: SettingsCatalogEntry, version?: number): void;
    preference(cli: CliId, preference: Preference): void;
}
declare class SettingsDisplayPool {
    private host?;
    private projects;
    private pendingWrites;
    resolve(metadata: SettingsCacheMetadata, enabled: Record<CliId, boolean>, readVersion?: number): SettingsDisplayCache;
}
export declare function settingsDisplayPool(api: object): SettingsDisplayPool;
export {};
