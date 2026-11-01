type Query = (signal: AbortSignal) => Promise<void>;
/** Bounds dialog requests. Host owns process cleanup, including after RPC cancellation. */
export declare class AccountQueryQueue<Key extends string> {
    private readonly limit;
    private readonly waiting;
    private readonly running;
    private priority?;
    constructor(limit?: number);
    has(key: Key): boolean;
    enqueue(key: Key, query: Query, replace?: boolean): boolean;
    prioritize(key: Key): void;
    cancel(key: Key): void;
    clear(): void;
    private drain;
}
export {};
