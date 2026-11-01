import { type Effort, type ModelChoice, type TaskMode } from '../shared/types.ts';
import type { EventInput, ProtocolResult } from './protocol.ts';
export interface GrokInput {
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
}
/** Offline help/ACP verified; subscription-dependent task execution remains unverified. */
export declare function prepareGrok(input: GrokInput): Promise<{
    argv: string[];
    env: Record<string, string>;
}>;
export declare function discoverGrok(executable: string, capture: (argv: string[], env?: Record<string, string>, phase?: 'native-candidates') => Promise<string>, stateDirectory: string, options?: {
    signal?: AbortSignal;
    home?: string;
    fetch?: typeof fetch;
}): Promise<ModelChoice[]>;
/** Native streaming-json parser from installed 1.0.0 docs; no fabricated execution evidence. */
export declare class GrokProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    private responses;
    private decoder;
    private pending;
    private response;
    private thought;
    private thoughtStep;
    private thoughtEmittedAt;
    private terminal;
    private failure?;
    private ended;
    private tools;
    result?: ProtocolResult;
    conversationId?: string;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number);
    feed(chunk: Buffer | string): void;
    end(): void;
    private id;
    private line;
}
