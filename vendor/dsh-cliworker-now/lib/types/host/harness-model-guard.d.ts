import type { Context } from '@deepseek-ai/cordis';
/** Retains attribution for model-powered tools that omit sessionId and purpose. */
export declare function withinCliTool<T>(runId: string, execute: () => Promise<T>): Promise<T>;
/** Only the authorized sibling job publisher uses this boundary. Its background
 * native conversation is a new run, not an auxiliary model call of the source tool.
 * The calling tool keeps its attribution; each new run's tools enter their own guard. */
export declare function publishSiblingOutsideTool<T>(publish: () => T): T;
export declare function installHarnessModelGuard(ctx: Context): () => void;
