import { z } from 'zod';
import { type Worker } from '../shared/types.ts';
import type { ContextTelemetryCheckpoint } from '../shared/telemetry.ts';
import type { RunTelemetry } from './telemetry.ts';
export declare const contextTelemetrySchema: z.ZodObject<{
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
    model: z.ZodString;
    observedModel: z.ZodOptional<z.ZodString>;
    runId: z.ZodUUID;
    contextUsed: z.ZodOptional<z.ZodNumber>;
    contextCapacity: z.ZodOptional<z.ZodNumber>;
    contextRatio: z.ZodOptional<z.ZodNumber>;
    contextSource: z.ZodOptional<z.ZodString>;
    contextCapacitySource: z.ZodOptional<z.ZodString>;
    contextEstimated: z.ZodOptional<z.ZodBoolean>;
    contextBreakdown: z.ZodOptional<z.ZodObject<{
        systemTokens: z.ZodOptional<z.ZodNumber>;
        toolTokens: z.ZodOptional<z.ZodNumber>;
        messageTokens: z.ZodOptional<z.ZodNumber>;
        estimated: z.ZodOptional<z.ZodBoolean>;
        source: z.ZodOptional<z.ZodString>;
        categories: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            tokens: z.ZodNumber;
            kind: z.ZodEnum<{
                used: "used";
                free: "free";
                buffer: "buffer";
                deferred: "deferred";
            }>;
        }, z.core.$strict>>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/** An absent sample means pending; an own undefined sample explicitly invalidates the prior window. */
export declare function withContextTelemetry(worker: Worker, current: RunTelemetry): RunTelemetry;
export declare function withoutContextTelemetry(current: RunTelemetry): RunTelemetry;
/** Capture before run identity changes and at settlement; never infer context from a token bill. */
export declare function captureContextTelemetry(worker: Worker, current: RunTelemetry): ContextTelemetryCheckpoint | undefined;
