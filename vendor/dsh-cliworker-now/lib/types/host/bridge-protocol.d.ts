import type { EventInput, ProtocolResult } from './protocol.ts';
import { type NativeApprovalRequest } from './native-approval-policy.ts';
/** Internal framing for owned native transports; never accepts arbitrary event kinds. */
export declare class BridgeProtocol {
    private emit;
    private identify;
    private maxLineBytes;
    /** Host relay for native authorization requests; absent runs keep the runner's denial. */
    private approval?;
    private decoder;
    private pending;
    private requestSequence;
    private nativeRunId?;
    conversationId?: string;
    result?: ProtocolResult;
    constructor(emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number, 
    /** Host relay for native authorization requests; absent runs keep the runner's denial. */
    approval?: ((id: string, request: NativeApprovalRequest) => void) | undefined);
    feed(chunk: Buffer | string): void;
    end(): void;
    private line;
}
