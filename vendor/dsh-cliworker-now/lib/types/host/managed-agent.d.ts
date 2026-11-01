import type { SubprocessHandle, SubprocessSpawnSpec } from '@deepseek-ai/dsh-subprocess';
import type { ProcessBackend } from './process.ts';
/** Preserve pipes while using Harness's stronger terminal descendant ownership. */
export declare function spawnManagedAgent(backend: ProcessBackend, spec: SubprocessSpawnSpec): Promise<SubprocessHandle>;
