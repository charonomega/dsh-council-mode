import { type FlowDefinition } from './engine.ts';
/** The highlighted row of Kimi's /logout list, when it is the managed Kimi Code login. */
export declare function kimiOAuthRow(lines: string[]): {
    row: string;
    target: boolean;
} | undefined;
export declare const KIMI_FLOW: FlowDefinition;
