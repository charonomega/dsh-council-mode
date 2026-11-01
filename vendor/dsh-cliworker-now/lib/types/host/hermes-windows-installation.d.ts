/** Read only the single stored __main__.py member emitted by distlib. No ZIP
 * extraction, Python evaluation, installer invocation, or account lookup. */
export declare function hermesDistlibSource(bytes: Buffer): string | undefined;
export declare function hermesLauncherCheckout(source: string): string | undefined;
export declare function windowsHermesCheckout(executable: string, command: string[], signal?: AbortSignal): Promise<string | undefined>;
