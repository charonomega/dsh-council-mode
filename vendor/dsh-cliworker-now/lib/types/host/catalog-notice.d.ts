/** Attach a settings notice to a discovered model list. */
export declare function withCatalogNotice<T extends object>(models: T, notice: string): T;
export declare function catalogNoticeOf(models: object): string | undefined;
/** The provider rejected every credential that could serve this CLI. */
export declare const catalogAuthenticationFailed: (label: string) => string;
/** Models remain from other credentials; some were rejected by the provider. */
export declare const catalogSkippedCredentials: (count: number) => string;
/**
 * Apply the shared rule to a list built while `rejected` credentials were skipped.
 * An empty list keeps the reason as its notice; the caller reports it after its
 * own cleanup instead of the generic empty-catalog message.
 */
export declare function explainAuthenticationScope<T extends object[]>(models: T, rejected: number, label: string): T;
