import { z } from 'zod';
import { type Worker } from '../shared/types.ts';
import type { ConversationTelemetryCheckpoint, LastRunUsageSnapshot, TokenUsage } from '../shared/telemetry.ts';
import type { RunTelemetry } from './telemetry.ts';
export declare const sessionUsageSchema: z.ZodObject<{
    total: z.ZodNumber;
    input: z.ZodOptional<z.ZodNumber>;
    output: z.ZodOptional<z.ZodNumber>;
    cacheRead: z.ZodOptional<z.ZodNumber>;
    cacheWrite: z.ZodOptional<z.ZodNumber>;
    reasoning: z.ZodOptional<z.ZodNumber>;
    orchestration: z.ZodOptional<z.ZodObject<{
        input: z.ZodOptional<z.ZodNumber>;
        output: z.ZodOptional<z.ZodNumber>;
        cacheRead: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    scope: z.ZodLiteral<"session">;
}, z.core.$strict>;
export declare const conversationTelemetrySchema: z.ZodObject<{
    policy: z.ZodLiteral<1>;
    cli: z.ZodEnum<{
        antigravity: "antigravity";
        codex: "codex";
        claude: "claude";
        kimi: "kimi";
        mimo: "mimo";
        zcode: "zcode";
        grok: "grok";
        omp: "omp";
        pi: "pi";
        hermes: "hermes";
        opencode: "opencode";
        qoder: "qoder";
        qodercn: "qodercn";
    }>;
    conversationId: z.ZodString;
    runId: z.ZodUUID;
    usage: z.ZodObject<{
        total: z.ZodNumber;
        input: z.ZodOptional<z.ZodNumber>;
        output: z.ZodOptional<z.ZodNumber>;
        cacheRead: z.ZodOptional<z.ZodNumber>;
        cacheWrite: z.ZodOptional<z.ZodNumber>;
        reasoning: z.ZodOptional<z.ZodNumber>;
        orchestration: z.ZodOptional<z.ZodObject<{
            input: z.ZodOptional<z.ZodNumber>;
            output: z.ZodOptional<z.ZodNumber>;
            cacheRead: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        scope: z.ZodLiteral<"session">;
    }, z.core.$strict>;
    sessionDurationSeconds: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
/** Retain the CLI's counter convention; native UI normalization remains separate. */
export declare const lastRunUsageSnapshotSchema: z.ZodObject<{
    policy: z.ZodLiteral<1>;
    cli: z.ZodEnum<{
        antigravity: "antigravity";
        codex: "codex";
        claude: "claude";
        kimi: "kimi";
        mimo: "mimo";
        zcode: "zcode";
        grok: "grok";
        omp: "omp";
        pi: "pi";
        hermes: "hermes";
        opencode: "opencode";
        qoder: "qoder";
        qodercn: "qodercn";
    }>;
    conversationId: z.ZodString;
    runId: z.ZodUUID;
    usage: z.ZodObject<{
        total: z.ZodNumber;
        input: z.ZodOptional<z.ZodNumber>;
        output: z.ZodOptional<z.ZodNumber>;
        cacheRead: z.ZodOptional<z.ZodNumber>;
        cacheWrite: z.ZodOptional<z.ZodNumber>;
        reasoning: z.ZodOptional<z.ZodNumber>;
        orchestration: z.ZodOptional<z.ZodObject<{
            input: z.ZodOptional<z.ZodNumber>;
            output: z.ZodOptional<z.ZodNumber>;
            cacheRead: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        scope: z.ZodLiteral<"run">;
    }, z.core.$strict>;
}, z.core.$strict>;
/** Call at settlement and before runId changes; observed partial .usage is not a full-run source. */
export declare function captureLastRunUsageSnapshot(worker: Worker, current: RunTelemetry): LastRunUsageSnapshot | undefined;
/** Capture before changing runId and at settlement. No raw-history scan or arithmetic is involved. */
export declare function captureConversationTelemetry(worker: Worker, current: RunTelemetry): ConversationTelemetryCheckpoint | undefined;
/** Exact sum of two session receipts; a bucket missing from either side is unknown, not zero. */
export declare function addSessionUsage(left: TokenUsage | undefined, right: TokenUsage): TokenUsage;
/** A task continued in a new session after an account change keeps counting
 * the sessions it left; only session-scoped usage is combined. */
export declare function withConversationTelemetry(worker: Worker, current: RunTelemetry): RunTelemetry;
