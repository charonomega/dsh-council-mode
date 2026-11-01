export const EFFORTS = [
    'default',
    'none',
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
    'ultra',
];
export const CLI_IDS = [
    'antigravity',
    'codex',
    'claude',
    'kimi',
    'mimo',
    'zcode',
    'grok',
    'omp',
    'pi',
    'hermes',
    'opencode',
    'qoder',
    'qodercn',
];
export const RETIRED_HARNESS_NOTICE = '外部 Harness CLI 入口已移除；历史记录仅供查看。请新建 Hermes Agent 任务。';
export const isRetiredCli = (cli) => cli === 'harness';
export const CLI_LABELS = {
    antigravity: 'Antigravity',
    codex: 'Codex',
    claude: 'Claude Code',
    kimi: 'Kimi',
    mimo: 'MiMo',
    zcode: 'ZCode',
    grok: 'Grok Build',
    omp: 'OMP',
    pi: 'Pi',
    hermes: 'Hermes Agent',
    harness: 'Harness（已移除）',
    opencode: 'OpenCode',
    qoder: 'Qoder CLI',
    qodercn: 'Qoder CN CLI',
};
/** Short CLI stems used for automatic Worker names; protocol IDs remain unchanged. */
export const CLI_SHORT_NAMES = {
    antigravity: 'agy',
    codex: 'codex',
    claude: 'claude',
    kimi: 'kimi',
    mimo: 'mimo',
    zcode: 'zcode',
    grok: 'grok',
    omp: 'omp',
    pi: 'pi',
    hermes: 'hermes',
    harness: 'harness',
    opencode: 'opencode',
    qoder: 'qoder',
    qodercn: 'qodercn',
};
export const cliOf = (preference) => preference.cli ?? 'antigravity';
export const effortLabel = (effort) => effort === 'default' ? '默认' : effort.charAt(0).toUpperCase() + effort.slice(1);
export const LEGACY_ACCOUNT_RECORD_NOTICE = '此历史任务缺少账号记录，请新建任务';
/** Exact legacy stop messages are compatible; other interrupted outcomes stay diagnostic. */
export const isUserInterrupted = (worker) => worker.status === 'interrupted' &&
    ((worker.interruptionReason === 'user' && !worker.error) ||
        ['Error: 用户已停止任务', '用户已取消排队任务'].includes(worker.error ?? ''));
/** Stable, non-mutating name for histories created before named workers. */
export const workerName = (worker) => worker.agentName || `智能体-${worker.id.slice(0, 6)}`;
export const active = (status) => status === 'queued' || status === 'running' || status === 'stopping';
/** Fold repeated step updates without duplicating streamed text or the final response. */
export function foldEvents(events, endedRun, cli) {
    const rows = [];
    const steps = new Map();
    const submissions = new Map();
    const submissionIds = new Set(events.filter((event) => event.kind === 'submission').map((event) => event.queuedFollowupId));
    const markEnded = (runId, status) => {
        for (const row of rows) {
            if ((row.kind === 'tool' || row.kind === 'reasoning') &&
                row.id.startsWith(runId + ':') &&
                ['ACTIVE', 'RUNNING', 'PENDING', 'QUEUED', 'IN_PROGRESS'].includes(row.state ?? ''))
                row.runStatus = status;
        }
    };
    for (const event of events) {
        if (event.kind === 'submission' && event.queuedFollowupId) {
            const row = submissions.get(event.queuedFollowupId) ?? {
                id: `submission:${event.queuedFollowupId}`,
                kind: 'user',
                text: event.text,
                time: event.time,
                queuedFollowupId: event.queuedFollowupId,
            };
            if (!submissions.has(event.queuedFollowupId))
                rows.push(row);
            Object.assign(row, {
                deliveryState: event.deliveryState,
                deliveryError: event.deliveryError,
                admittedRunId: event.admittedRunId,
                submissionClientId: event.submissionClientId,
                submissionSequence: event.submissionSequence,
            });
            submissions.set(event.queuedFollowupId, row);
            continue;
        }
        if (event.kind === 'user' && event.queuedFollowupId && submissionIds.has(event.queuedFollowupId))
            continue;
        if (event.kind === 'status') {
            const terminal = event.state ?? event.text;
            if (terminal === 'completed' ||
                terminal === 'failed' ||
                terminal === 'interrupted' ||
                terminal === 'uncertain')
                markEnded(event.runId, terminal);
        }
        if (event.kind === 'result') {
            // A failed aggregate is diagnostic evidence, not a replacement for
            // already observed text (including histories written by older versions).
            if (cli === 'antigravity' && event.state && event.state !== 'SUCCESS') {
                rows.push({
                    id: `${event.runId}:event:${event.seq}`,
                    kind: 'diagnostic',
                    text: 'CLI 最终汇总',
                    time: event.time,
                    state: event.state,
                    detail: event.detail ?? event.text,
                });
                continue;
            }
            const lastAssistant = rows.findLast((row) => row.kind === 'assistant' && row.id.startsWith(event.runId + ':'));
            if (lastAssistant) {
                // An aggregate receipt cannot extend a response with its own explicit
                // content identity and boundary. Its body may include earlier calls.
                if (lastAssistant.response)
                    continue;
                const earlier = rows.filter((row) => row !== lastAssistant && row.kind === 'assistant' && row.id.startsWith(event.runId + ':'));
                let finalText = event.text;
                if (earlier.length && event.resultScope === 'run') {
                    const prefix = earlier.map((row) => row.text).join('');
                    // An explicit aggregate must agree with every observed segment.
                    finalText = event.text.startsWith(prefix) ? event.text.slice(prefix.length) : undefined;
                }
                else if (earlier.length && !event.resultScope && cli === 'antigravity') {
                    // Older AGY aggregates insert whitespace between response steps.
                    // This compatibility rule is confined to that verified CLI format.
                    let remaining = event.text.trimStart();
                    for (const row of earlier) {
                        const prefix = row.text.trim();
                        if (!prefix)
                            continue;
                        if (!remaining.startsWith(prefix)) {
                            remaining = '';
                            break;
                        }
                        remaining = remaining.slice(prefix.length).trimStart();
                    }
                    finalText = remaining || undefined;
                }
                else if (earlier.length && !event.resultScope && !event.text.startsWith(lastAssistant.text)) {
                    // Historical receipts without scope cannot prove an aggregate boundary.
                    finalText = undefined;
                }
                if (event.text && finalText !== undefined && finalText.startsWith(lastAssistant.text))
                    lastAssistant.text = finalText;
                continue;
            }
        }
        const key = event.response
            ? `${event.runId}:response:${JSON.stringify([event.response.id, event.response.blockId])}`
            : event.step === undefined
                ? `${event.runId}:event:${event.seq}`
                : `${event.runId}:${event.kind}:${event.step}`;
        const existing = steps.get(key);
        if (existing) {
            if (event.response && (existing.kind !== event.kind || existing.response?.index !== event.response.index))
                throw new Error('CLI response block identity changed');
            if (event.response?.usage && existing.response?.usage &&
                JSON.stringify(event.response.usage) !== JSON.stringify(existing.response.usage))
                throw new Error('CLI response usage changed');
            if (event.kind === 'assistant')
                existing.text += event.text;
            else if (event.text)
                existing.text = event.text;
            if (event.state)
                existing.state = event.state;
            if (event.response)
                existing.response = { ...existing.response, ...event.response };
            if (event.toolCall)
                existing.toolCall = {
                    ...existing.toolCall,
                    ...Object.fromEntries(Object.entries(event.toolCall).filter(([, value]) => value !== undefined)),
                };
            // Public reasoning carries a complete visible-text snapshot. An empty
            // snapshot can withdraw a block; never append or retain its older text.
            if (event.detail || (event.kind === 'reasoning' && event.detail !== undefined))
                existing.detail = event.detail;
        }
        else {
            const row = {
                id: key,
                kind: event.kind === 'result' ? 'assistant' : event.kind,
                text: event.text,
                time: event.time,
                state: event.state,
                detail: event.detail,
                toolCall: event.toolCall,
                response: event.response,
                queuedFollowupId: event.queuedFollowupId,
                admittedRunId: event.admittedRunId,
            };
            steps.set(key, row);
            rows.push(row);
        }
    }
    // Use full persisted events before pagination. Duration includes admission/queue time.
    const timing = new Map();
    for (const event of events) {
        const run = timing.get(event.runId) ?? {};
        if ((event.kind === 'user' || (event.kind === 'status' && (event.state ?? event.text) === 'queued')) &&
            !run.runStartedAt)
            run.runStartedAt = event.time;
        if (event.kind === 'status' &&
            ['completed', 'failed', 'interrupted', 'uncertain'].includes(event.state ?? event.text)) {
            run.runEndedAt = event.time;
            run.runOutcome = (event.state ?? event.text);
        }
        timing.set(event.runId, run);
    }
    for (const row of rows)
        Object.assign(row, timing.get(row.admittedRunId ?? row.id.split(':')[0]));
    if (endedRun)
        markEnded(endedRun.runId, endedRun.status);
    return rows;
}
//# sourceMappingURL=types.js.map