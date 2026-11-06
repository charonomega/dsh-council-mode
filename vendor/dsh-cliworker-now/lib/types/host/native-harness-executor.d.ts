import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecutionInput, ToolExecutionResult } from '@deepseek-ai/dsh-tools';
type NativeHarnessCall = Pick<ToolExecutionInput, 'callId' | 'name' | 'arguments' | 'agent' | 'signal'>;
/** A run-owned, single-call native path, independent of the scope's model executor. */
export interface NativeHarnessExecutor {
    execute(input: NativeHarnessCall): Promise<ToolExecutionResult>;
    dispose(): void;
}
/**
 * Use the same native scheduler/policy pipeline as NativeToolExecutor without
 * registering an executor (a child may already select PTC). Load the new
 * subpath only on new hosts; rc.5 keeps its scoped presentation and disposer.
 */
export declare function createNativeHarnessExecutor(ctx: Context): Promise<NativeHarnessExecutor>;
export {};
