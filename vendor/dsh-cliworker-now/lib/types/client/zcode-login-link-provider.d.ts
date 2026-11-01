import type { ILinkProvider, Terminal } from '@xterm/xterm';
type TerminalBuffer = Pick<Terminal, 'buffer' | 'cols'>;
/**
 * The caller supplies only the active ZCode login parser's approved URL and
 * disposes its registerLinkProvider handle on close. No URL discovery, browser
 * opening, output logging, or persistence happens while links are requested.
 */
export declare function createZcodeLoginLinkProvider(terminal: TerminalBuffer, currentUrl: () => string | undefined, open: (url: string) => void): ILinkProvider;
export {};
