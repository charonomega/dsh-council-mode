import type { SubprocessTerminalHandle, SubprocessTerminalSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import { type ProcessBackend } from './process.ts';
/** A fixed diagnostic; never derived from PowerShell or native output. */
export declare class WindowsAccountTerminalError extends Error {
    constructor();
}
/** ConPTY publishes pid=0 during async allocation in the pinned Windows SDK.
 * Attach a waiting bootstrap to a lifecycle-only Job before allowing the CLI to
 * spawn. The separate owner is itself held by the Host's ordinary subprocess
 * Job, so closing/crashing the Host also closes the account process range.
 */
export declare function spawnAccountTerminal(backend: ProcessBackend, spec: SubprocessTerminalSpawnSpec, options?: {
    platform?: NodeJS.Platform;
    handshakeMs?: number;
    cleanupMs?: number;
    terminalExitMs?: number;
}): Promise<SubprocessTerminalHandle>;
