import type { Context } from '@deepseek-ai/cordis';
/** Retains attribution for model-powered tools that omit sessionId and purpose. */
export declare function withinCliTool<T>(runId: string, execute: () => Promise<T>): Promise<T>;
export declare function installHarnessModelGuard(ctx: Context): () => void;
