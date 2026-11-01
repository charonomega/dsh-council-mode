/** Host-private identity. Never accept an identity supplied by the CLI as authority. */
export interface NativeHarnessBinding {
    parentSessionId: string;
    harnessSessionId: string;
    workerId: string;
    runId: string;
    cli: string;
}
export interface NativeHarnessConnection {
    url: string;
    token: string;
    binding: NativeHarnessBinding;
    /** Native permissions have explicitly admitted this exact managed bridge. */
    executionReady?: boolean;
}
export interface NativeHarnessTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execution: 'host' | 'model' | 'dispatch' | 'unknown';
}
export interface NativeHarnessSkill {
    name: string;
    description: string;
    content: string;
    requiredTools?: readonly string[];
    resourceBase?: {
        kind: 'directory';
        path: string;
    } | {
        kind: 'url';
        url: string;
    } | {
        kind: 'opaque';
        description: string;
    };
}
export interface NativeHarnessToolsOptions {
    binding: NativeHarnessBinding;
    /** Resolve the current child Agent's scoped tools.schemas(), not a global catalog. */
    tools: readonly NativeHarnessTool[] | ((signal: AbortSignal) => readonly NativeHarnessTool[] | Promise<readonly NativeHarnessTool[]>);
    authorize(binding: Readonly<NativeHarnessBinding>, operation: {
        method: string;
        name?: string;
    }): void | Promise<void>;
    /** Must use the scoped Host tools runtime; never call a tool definition directly. */
    execute(input: {
        binding: Readonly<NativeHarnessBinding>;
        callId: string;
        name: string;
        arguments: unknown;
        signal: AbortSignal;
    }): Promise<unknown>;
    skills?: {
        list(signal: AbortSignal): Promise<readonly {
            name: string;
            description: string;
        }[]>;
        get(name: string, signal: AbortSignal): Promise<NativeHarnessSkill | undefined>;
    };
    signal?: AbortSignal;
    maxBytes?: number;
    maxCalls?: number;
    executionReady?: boolean;
}
/**
 * The scoped registry establishes availability; a familiar name or MCP prefix
 * establishes nothing. Effects and approvals still belong to tools.execute.
 * Auxiliary model calls are additionally rejected by withinCliTool's guard.
 */
export declare function classifyHarnessTool(name: string, visibleSchemas?: readonly {
    name: string;
}[]): NativeHarnessTool['execution'];
export declare function createNativeHarnessTools(options: NativeHarnessToolsOptions): Promise<{
    connection: NativeHarnessConnection;
    capabilities: {
        reason?: string | undefined;
        transport: boolean;
        ready: boolean;
        toolCount: number;
        skills: boolean;
    };
    close: () => Promise<void>;
}>;
/**
 * A lease is owned from the moment it is created. Until the caller receives the
 * returned handle, any publication failure closes the listening bridge and
 * restores the child presentation before the original error is reported.
 */
export declare function adoptNativeHarnessLease<T extends {
    connection: unknown;
    close(): Promise<void>;
}>(lease: T, resetPresentation: () => void, publish: () => void): Promise<{
    connection: T['connection'];
    close(): Promise<void>;
}>;
