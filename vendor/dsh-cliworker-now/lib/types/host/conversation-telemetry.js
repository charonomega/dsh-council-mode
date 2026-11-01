import { z } from 'zod';
import { CLI_IDS, cliOf, isRetiredCli } from "../shared/types.js";
import { nativeUsageReport } from "../shared/native-usage-report.js";
import { nativeTokenUsage } from "../shared/native-token-usage.js";
import { hermesCanonicalUsage } from "./hermes-canonical-usage.js";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const sessionUsage = z.object({
    total: count,
    input: count.optional(),
    output: count.optional(),
    cacheRead: count.optional(),
    cacheWrite: count.optional(),
    reasoning: count.optional(),
    orchestration: z.object({ input: count.optional(), output: count.optional(), cacheRead: count.optional() }).strict().optional(),
    scope: z.literal('session'),
}).strict();
export const conversationTelemetrySchema = z.object({
    policy: z.literal(1),
    cli: z.enum(CLI_IDS),
    conversationId: z.string().min(1).max(1024),
    runId: z.uuid(),
    usage: sessionUsage,
    sessionDurationSeconds: z.number().finite().nonnegative().optional(),
}).strict();
/** Retain the CLI's counter convention; native UI normalization remains separate. */
export const lastRunUsageSnapshotSchema = z.object({
    policy: z.literal(1),
    cli: z.enum(CLI_IDS),
    conversationId: z.string().min(1).max(1024),
    runId: z.uuid(),
    usage: sessionUsage.extend({ scope: z.literal('run') }),
}).strict().superRefine((value, context) => {
    if (!nativeTokenUsage(value.cli, value.usage) && !nativeUsageReport(value.cli, value.usage))
        context.addIssue({ code: 'custom', message: 'Run usage buckets are inconsistent' });
});
function matchingLastRunSnapshot(worker, current) {
    const parsed = lastRunUsageSnapshotSchema.safeParse(worker.lastRunUsageSnapshot);
    // Only the exact raw run's rejected derived zero invalidates this fallback;
    // explicit native zero receipts and confirmed previous runs remain valid.
    return parsed.success && parsed.data.cli === cliOf(worker.preference) &&
        parsed.data.conversationId === worker.conversationId &&
        !(current?.unsettledRunUsage && parsed.data.cli === 'codex' && parsed.data.usage.total === 0 && parsed.data.runId === worker.runId)
        ? { ...parsed.data, usage: parsed.data.cli === 'hermes' ? hermesCanonicalUsage(parsed.data.usage) : parsed.data.usage }
        : undefined;
}
/** Call at settlement and before runId changes; observed partial .usage is not a full-run source. */
export function captureLastRunUsageSnapshot(worker, current) {
    const cli = cliOf(worker.preference);
    if (!worker.conversationId || isRetiredCli(cli))
        return undefined;
    const parsed = lastRunUsageSnapshotSchema.safeParse({ policy: 1, cli,
        conversationId: worker.conversationId, runId: worker.runId, usage: current.runUsage });
    return parsed.success
        ? { ...parsed.data, usage: cli === 'hermes' ? hermesCanonicalUsage(parsed.data.usage) : parsed.data.usage }
        : matchingLastRunSnapshot(worker, current);
}
function matchingCheckpoint(worker) {
    // ZCode's EventReducer total starts from zero per process; older builds
    // incorrectly persisted that run counter as a whole-session checkpoint.
    if (cliOf(worker.preference) === 'zcode')
        return undefined;
    const parsed = conversationTelemetrySchema.safeParse(worker.conversationTelemetry);
    return parsed.success && parsed.data.cli === cliOf(worker.preference) &&
        parsed.data.conversationId === worker.conversationId
        ? { ...parsed.data, usage: parsed.data.cli === 'hermes' ? hermesCanonicalUsage(parsed.data.usage) : parsed.data.usage }
        : undefined;
}
/** Capture before changing runId and at settlement. No raw-history scan or arithmetic is involved. */
export function captureConversationTelemetry(worker, current) {
    const cli = cliOf(worker.preference);
    if (cli === 'zcode')
        return undefined;
    if (!worker.conversationId || worker.conversationId.length > 1024 || isRetiredCli(cli))
        return undefined;
    const usage = sessionUsage.safeParse(current.usage);
    if (!usage.success)
        return matchingCheckpoint(worker);
    return {
        policy: 1,
        cli,
        conversationId: worker.conversationId,
        runId: worker.runId,
        usage: cli === 'hermes' ? hermesCanonicalUsage(usage.data) : usage.data,
        ...(typeof current.sessionDurationSeconds === 'number' &&
            Number.isFinite(current.sessionDurationSeconds) && current.sessionDurationSeconds >= 0
            ? { sessionDurationSeconds: current.sessionDurationSeconds } : {}),
    };
}
/** Prefer session receipts, then current accounting, then an explicitly run-scoped prior receipt. */
export function withConversationTelemetry(worker, current) {
    const cumulative = captureConversationTelemetry(worker, current);
    if (!cumulative) {
        if (current.usage !== undefined)
            return current;
        const lastRun = matchingLastRunSnapshot(worker, current);
        return lastRun ? { ...current, usage: lastRun.usage, usageRunId: lastRun.runId } : current;
    }
    return {
        ...current,
        usage: cumulative.usage,
        usageRunId: cumulative.runId,
        ...(current.sessionDurationSeconds === undefined && cumulative.sessionDurationSeconds !== undefined
            ? { sessionDurationSeconds: cumulative.sessionDurationSeconds } : {}),
    };
}
//# sourceMappingURL=conversation-telemetry.js.map