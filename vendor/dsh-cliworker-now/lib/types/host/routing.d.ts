import type { Context } from '@deepseek-ai/cordis';
import { type UserMessage } from '@deepseek-ai/dsh-llm';
import { type ActiveCliId } from '../shared/types.ts';
/** One source for tool normalization, natural-language hints and model guidance. */
export declare const CLI_ALIASES: Record<ActiveCliId, readonly string[]>;
export type CliResolution = {
    status: 'resolved';
    cli: ActiveCliId;
    match: 'canonical' | 'alias' | 'fuzzy';
    matchedName: string;
} | {
    status: 'ambiguous' | 'unknown' | 'retired';
    candidates: ActiveCliId[];
};
/** Explicit tool selectors may be aliases; unresolved selectors never select a default. */
export declare function resolveCliName(name: string): CliResolution;
export declare function requireCliName(name: string): ActiveCliId;
/** Lexical Qoder names are a family selector until local installation discovery. */
export declare function isGenericQoderName(name: string): boolean;
export type AvailableCliResolution = CliResolution | {
    status: 'unavailable';
    candidates: [];
    reason: 'qoder-not-installed';
};
/** Only completed absence is false; probe errors remain errors, never fallback authority. */
export declare function resolveAvailableCliName(name: string, installed: (cli: 'qoder' | 'qodercn') => Promise<boolean>): Promise<AvailableCliResolution>;
export declare const CLI_NAME_GUIDANCE: string;
export declare const CLI_DELEGATION_GUIDANCE: string;
/** Recognize only direct commands in this human input; quoted/model/tool text is excluded. */
export declare function invocationResolution(messages: readonly UserMessage[]): CliResolution | undefined;
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'cliworker-invocation': {
            kind: 'cliworker-invocation';
            form: 'instructions';
        };
    }
}
/** Add guidance to the accepted batch, which is sent in this very model request. */
export declare function registerCliRouting(ctx: Context): () => Promise<void>;
