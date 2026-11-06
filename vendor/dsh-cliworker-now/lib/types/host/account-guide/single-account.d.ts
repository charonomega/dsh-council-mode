import { type FlowDefinition } from './engine.ts';
export declare const CODEX_FLOW: FlowDefinition;
export declare const CLAUDE_FLOW: FlowDefinition;
export declare const QODER_FLOW: FlowDefinition;
export declare const QODERCN_FLOW: FlowDefinition;
export declare const GROK_FLOW: FlowDefinition;
export declare const ZCODE_FLOW: FlowDefinition;
export declare const MIMO_FLOW: FlowDefinition;
/** The highlighted row (●) of MiMo 0.1.15's "Remove credential" list, once drawn in full. */
export declare function mimoLogoutRow(lines: string[]): {
    row: string;
    target: boolean;
} | undefined;
