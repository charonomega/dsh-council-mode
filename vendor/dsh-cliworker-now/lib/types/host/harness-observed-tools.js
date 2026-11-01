import { ToolCallId } from '@deepseek-ai/dsh-llm';
const json = (value) => JSON.stringify(value) ?? 'null';
const terminal = (state) => /^(?:COMPLETED|COMPLETE|DONE|SUCCESS|FAILED|ERROR|CANCELLED|CANCELED)$/u.test(state ?? '');
const failed = (state) => /^(?:FAILED|ERROR|CANCELLED|CANCELED)$/u.test(state ?? '');
/** AgentLoop receives an existing CLI receipt; this registry cannot execute a tool. */
export class HarnessObservedTools {
    agent;
    record;
    runId;
    deps;
    source;
    receipts = new Map();
    names = new Set();
    disposers = [];
    disposed = false;
    finalized = new Set();
    accepted = new Set();
    constructor(agent, record, runId, deps, source) {
        this.agent = agent;
        this.record = record;
        this.runId = runId;
        this.deps = deps;
        this.source = source;
        // Release definitions only after ToolRuntime has materialized every receipt.
        this.disposers.push(agent.ctx.on('tools/result', (exec, result) => {
            if (exec.agent !== this.agent || !this.accepted.delete(exec.token))
                return;
            this.finalized.add(exec.callId);
            if (!result.isError &&
                result.concludesTurn &&
                this.source.completed() &&
                !this.source.hasFollowing() &&
                this.finalized.size === this.receipts.size)
                this.source.close();
        }));
    }
    async receipt(exec) {
        try {
            return await this.readReceipt(exec);
        }
        catch (error) {
            if (exec.signal.aborted)
                await this.source.stop();
            throw error;
        }
    }
    async readReceipt(exec) {
        const receipt = this.receipts.get(exec.callId);
        const assertOwner = () => {
            const worker = this.deps.getWorker(this.record.parentSessionId, this.record.workerId);
            if (this.disposed ||
                exec.agent !== this.agent ||
                this.agent.id !== this.record.sessionId ||
                worker.parentSessionId !== this.record.parentSessionId ||
                worker.runId !== this.runId ||
                (worker.harnessConversation && worker.harnessConversation.sessionId !== this.record.sessionId) ||
                !receipt ||
                receipt.name !== exec.name ||
                receipt.arguments !== json(exec.arguments))
                throw new Error('CLI 工具回执不属于当前子会话、运行或调用');
        };
        assertOwner();
        this.accepted.add(exec.token);
        let row;
        while (true) {
            exec.signal.throwIfAborted();
            assertOwner();
            row = this.source.rows().find((item) => item.id === receipt.rowId);
            if (!row)
                throw new Error('CLI 工具回执缺失');
            if (terminal(row.state) && (this.source.hasFollowing() || this.source.settled()))
                break;
            if (this.source.settled())
                break;
            await this.source.changed(exec.signal);
        }
        const output = row.toolCall?.output ?? row.detail ?? row.text;
        const text = typeof output === 'string' ? output : json(output);
        if (!terminal(row.state) || failed(row.state)) {
            const error = new Error(terminal(row.state) ? text : 'CLI 工具结果未确认，未重新执行。');
            Object.assign(error, { code: terminal(row.state) ? 'CLI_TOOL_FAILED' : 'TOOL_OUTCOME_UNKNOWN' });
            throw error;
        }
        if (this.source.completed() && !this.source.hasFollowing()) {
            await this.source.inputsSettled();
            exec.signal.throwIfAborted();
            assertOwner();
            if (this.source.completed() && !this.source.hasFollowing())
                exec.concludeTurn();
        }
        return JSON.parse(json(output));
    }
    declare(row) {
        if (this.disposed || !row.response || !row.toolCall?.callId || !row.toolCall.name)
            throw new Error('CLI 工具声明缺少响应或调用身份');
        const name = row.toolCall.name;
        if (name === 'run_code' || !/^[a-zA-Z0-9_.:-]{1,128}$/u.test(name))
            throw new Error('CLI 工具名称不能安全注册为回执适配');
        const callId = ToolCallId(`cliworker:${this.runId}:${row.toolCall.callId}`);
        const args = json(row.toolCall.input ?? {});
        const previous = this.receipts.get(callId);
        if (previous && (previous.rowId !== row.id || previous.name !== name || previous.arguments !== args))
            throw new Error('CLI 工具调用身份或参数发生变化');
        if (!this.names.has(name)) {
            const dispose = this.agent.ctx.tools.register({
                name,
                description: '读取已由 CLI 执行的这次调用回执，不执行工具',
                parameters: {},
                output: {
                    schema: {},
                    render: (_args, value) => [{ type: 'text', text: typeof value === 'string' ? value : json(value) }],
                },
                execute: (_args, exec) => this.receipt(exec),
                isConcurrencySafe: () => true,
            });
            this.names.add(name);
            this.disposers.push(dispose);
        }
        this.receipts.set(callId, { rowId: row.id, name, arguments: args });
        return { type: 'tool-call', id: callId, name, arguments: args };
    }
    close() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const dispose of this.disposers.splice(0).reverse())
            dispose();
    }
}
//# sourceMappingURL=harness-observed-tools.js.map