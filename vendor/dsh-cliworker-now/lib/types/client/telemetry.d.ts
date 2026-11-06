import { type Telemetry, type TokenUsage } from '../shared/telemetry.ts';
import type { Worker } from '../shared/types.ts';
import { type MessageKey } from './i18n.ts';
export declare function UsageIndicator({ usage, reply, providerCredits, creditsBased }: {
    usage?: TokenUsage;
    reply?: boolean;
    providerCredits?: number;
    creditsBased?: boolean;
}): import("react/jsx-runtime").JSX.Element;
export declare function contextFigures(telemetry?: Telemetry): {
    used: number | undefined;
    capacity: number | undefined;
    percent: number | undefined;
    rows: ({
        value: number | undefined;
        key: "systemTokens";
        label: MessageKey;
        color: "system";
    } | {
        value: number | undefined;
        key: "toolTokens";
        label: MessageKey;
        color: "tools";
    } | {
        value: number | undefined;
        key: "messageTokens";
        label: MessageKey;
        color: "messages";
    })[];
    complete: boolean;
    segments: {
        key: "systemTokens" | "toolTokens" | "messageTokens";
        color: "tools" | "system" | "messages";
        width: number;
    }[] | {
        key: string;
        color: undefined;
        width: number;
    }[];
};
/** rc.2 ContextMeter presentation, driven exclusively by this Worker's evidence. */
export declare function ContextDetails({ telemetry }: {
    telemetry?: Telemetry;
}): import("react/jsx-runtime").JSX.Element;
export declare function ComposerTelemetry({ worker, telemetry, statusLabel, }: {
    worker: Worker;
    telemetry?: Telemetry;
    statusLabel: string;
}): import("react/jsx-runtime").JSX.Element;
