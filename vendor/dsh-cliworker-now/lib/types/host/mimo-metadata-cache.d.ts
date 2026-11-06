import type { FirstPartyModelSource } from './first-party-models.ts';
export interface MimoOwnSnapshot {
    authPath: string;
    auth: Record<string, any>;
    configurations: {
        path: string;
        value: Record<string, any>;
    }[];
}
/** No raw environment, configuration or account material is retained in the cache key. */
export declare function nativeMetadataKey(executable: string, project: string, snapshot: unknown, signal: AbortSignal): Promise<string | undefined>;
export declare const mimoMetadataKey: typeof nativeMetadataKey;
/** Only native capabilities are reused. Remote entitlement discovery must still run on every call. */
export declare class MimoMetadataCache {
    private readonly ttlMs;
    private readonly limit;
    private readonly entries;
    constructor(ttlMs?: number, limit?: number);
    get(key: string | undefined, own: MimoOwnSnapshot): FirstPartyModelSource[] | undefined;
    clear(): void;
    set(key: string | undefined, sources: FirstPartyModelSource[], own: MimoOwnSnapshot): void;
}
export declare const mimoMetadataCache: MimoMetadataCache;
