import { AsyncLocalStorage } from 'node:async_hooks';
const executions = new AsyncLocalStorage();
/** Retains attribution for model-powered tools that omit sessionId and purpose. */
export function withinCliTool(runId, execute) {
    return executions.run(runId, execute);
}
/** Only the authorized sibling job publisher uses this boundary. Its background
 * native conversation is a new run, not an auxiliary model call of the source tool.
 * The calling tool keeps its attribution; each new run's tools enter their own guard. */
export function publishSiblingOutsideTool(publish) {
    return executions.exit(publish);
}
export function installHarnessModelGuard(ctx) {
    return ctx.on('llm/stream', async function* (_options, next) {
        if (executions.getStore())
            throw new Error('此工具需要额外模型生成，尚未接入 CLI；已禁止 DSH 模型 API 回退');
        yield* next();
    }, { global: true, prepend: true });
}
//# sourceMappingURL=harness-model-guard.js.map