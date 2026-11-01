import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { ProcessBackend } from './process.ts';
export declare const isCurrentWindowsRuntime: (value: string) => boolean;
/** Only console-subsystem targets need a GUI bootstrap. Existing Node helpers
 * already use Electron's GUI executable; terminal allocation stays untouched. */
export declare function needsWindowsHiddenLaunch(argv: readonly string[], platform: NodeJS.Platform, electron: boolean): boolean;
/** Window presentation only: all byte streams, collection and process-range
 * ownership remain the SDK's. Native exit facts travel over a private channel,
 * never stdout/stderr and never the native CLI's credential/session protocol. */
export declare function spawnWindowsHidden(backend: ProcessBackend, spec: SubprocessSpawnSpec, options?: {
    privateUmask?: true;
}): SubprocessHandle;
