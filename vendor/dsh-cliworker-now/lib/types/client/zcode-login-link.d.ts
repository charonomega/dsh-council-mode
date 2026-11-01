import type { ZCodeLoginProvider } from '../shared/accounts.ts';
export interface ZcodeLoginLinkParser {
    /** Returns only a newly completed native URL, never a partial line. Does not open or log it. */
    write(chunk: string): string | undefined;
    /** Forget pending ANSI/line state and the last URL on finish, close, retry or unmount. */
    reset(): void;
}
/**
 * The caller must enable this only for a ZCode login session and pass the selected
 * provider so one region cannot open the other region's URL. URLs stay in memory.
 * Accept a single complete line immediately after the fixed native --no-browser
 * prompt. SGR/cursor visibility do not affect text. The observed ConPTY blank
 * screen initialization is accepted only before any prompt/URL text; arbitrary
 * cursor edits do not become trusted text. OSC payloads are never stored.
 */
export declare function createZcodeLoginLinkParser(provider?: ZCodeLoginProvider): ZcodeLoginLinkParser;
