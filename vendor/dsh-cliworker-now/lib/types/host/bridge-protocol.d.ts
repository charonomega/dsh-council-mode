import type { EventInput, ProtocolResult } from './protocol.ts';
/** Internal framing for owned native transports; never accepts arbitrary event kinds. */
export declare class BridgeProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    private decoder;
    private pending;
    private requestSequence;
    private nativeRunId?;
    conversationId?: string;
    result?: ProtocolResult;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number);
    feed(chunk: Buffer | string): void;
    end(): void;
    private line;
}
