import type { Telemetry } from '../shared/telemetry.ts';
export declare function decodeAgyContext(data: Uint8Array): Telemetry | undefined;
export declare class AgyContextReader {
    private directory;
    private cache;
    constructor(directory?: string);
    read(conversationId?: string): Telemetry | undefined;
}
