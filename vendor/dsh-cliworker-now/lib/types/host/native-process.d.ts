import type { ProcessBackend } from './process.ts';
/** One normalization boundary for tasks, metadata and interactive account menus. */
export declare function nativeProcessBackend(backend: ProcessBackend, platform?: NodeJS.Platform, options?: {
    electron?: boolean;
}): ProcessBackend;
