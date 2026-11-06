import type { ProcessBackend } from './process.ts';
import { type WindowsSystemProxySource } from './windows-system-proxy.ts';
/** One normalization boundary for tasks, metadata and interactive account menus. */
export declare function nativeProcessBackend(backend: ProcessBackend, platform?: NodeJS.Platform, 
/** The Windows Internet Options proxy handed to every CLI that has none of its own. */
options?: {
    electron?: boolean;
    systemProxy?: WindowsSystemProxySource;
}): ProcessBackend;
