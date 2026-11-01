import type { CliId } from '../shared/types.ts';
import type { EventInput, ProtocolResult } from './protocol.ts';
/** Normalizes only public CLI messages. Never synthesizes hidden reasoning. */
export declare class CliProtocol {
    private cli;
    private emit;
    private identify;
    private maxLineBytes;
    private decoder;
    private pending;
    private steps;
    private completed;
    private lastAssistant;
    private mimoFinished;
    private openTools;
    private claudeResponses;
    private claudeMessage?;
    private claudeBlock?;
    private claudeTools;
    private mimoResponses;
    conversationId?: string;
    result?: ProtocolResult;
    constructor(cli: Exclude<CliId, 'antigravity'>, emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number);
    feed(chunk: Buffer | string): void;
    end(): void;
    private id;
    private step;
    private assistant;
    private tool;
    private finish;
    private line;
}
