import { type Effort, type ModelChoice, type TaskMode } from '../shared/types.ts';
import type { EventInput, ProtocolResult } from './protocol.ts';
import type { TokenUsage } from '../shared/telemetry.ts';
import { type HermesRenewalContext } from './hermes-renewal.ts';
export interface HermesInput {
    executable: string;
    project: string;
    preference: {
        model: string;
        effort: Effort;
    };
    mode: TaskMode;
    prompt: string;
    conversationId?: string;
    stateDirectory: string;
    hermesHome?: string;
    renewal?: HermesRenewalContext;
}
export declare function hermesHomeDirectory(configured?: string): string;
/** Account setup may create a new home. Resolve its nearest existing ancestor before
 * granting writes, so a parent symlink cannot turn a narrow-looking path into all of HOME.
 * Returns a canonical path for the sandbox and native HERMES_HOME to share.
 */
export declare function validateHermesHomeDirectory(path: string): string;
/** Read-only native scalar queries; never prints a config object containing API keys. */
export declare function discoverHermes(executable: string, capture: (argv: string[], env?: Record<string, string>) => Promise<string>, stateDirectory: string, hermesHome?: string, options?: {
    signal?: AbortSignal;
    fetch?: typeof fetch;
    renewal?: HermesRenewalContext;
}): Promise<ModelChoice[]>;
/** Official stream-json CLI; not a claim of local installation or live execution. */
export declare function prepareHermes(input: HermesInput): Promise<{
    argv: string[];
    env: Record<string, string>;
}>;
export type HermesRecord = {
    type: 'system';
    subtype: 'init';
    session_id: string;
    model: string;
} | {
    type: 'text';
    text: string;
} | {
    type: 'tool_use';
    name: string;
    input?: Record<string, unknown>;
    tool_call_id?: string;
} | {
    type: 'tool_result';
    name: string;
    output: string;
    is_error: boolean;
    duration_ms: number;
    tool_call_id?: string;
} | {
    type: 'result';
    session_id: string;
    exit_code: number;
    text: string;
    error?: string;
    tokens?: Record<string, number>;
    duration_ms?: number;
};
/** Canonical Hermes stdio/database input excludes both cache buckets. Normalize
 * to the inclusive input used by the HTTP adapter and shared Hermes telemetry.
 * These remain run totals, never context occupancy or per-response counters.
 */
export declare function hermesTokenUsage(tokens: unknown): TokenUsage | undefined;
/** Native record validation; the source protocol has no public reasoning event. */
export declare function parseHermesRecord(value: unknown): HermesRecord;
export declare class HermesProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    private decoder;
    private pending;
    private response;
    private assistantStep;
    private assistantSegmentOpen;
    private final?;
    private terminal;
    private ended;
    private failure?;
    private tools;
    result?: ProtocolResult;
    conversationId?: string;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number);
    feed(chunk: Buffer | string): void;
    end(): void;
    private assistant;
    private id;
    private line;
}
