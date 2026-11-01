/** Hash current bounded own files without retaining file content or following links. */
export declare function metadataFileFingerprint(path: string, signal: AbortSignal): Promise<string | undefined>;
/** Callers admit only validated public capabilities, never account status or raw CLI output. */
export declare class NativeCapabilityCache<T> {
    private readonly ttlMs;
    private readonly limit;
    private readonly entries;
    constructor(ttlMs?: number, limit?: number);
    get(key: string | undefined): T | undefined;
    set(key: string | undefined, value: T): void;
}
