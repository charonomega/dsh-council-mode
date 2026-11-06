import type { CliId, Preference, TaskMode, Worker } from '../shared/types.ts';
import type { RuntimeConfig } from './process.ts';
import type { NativeHarnessConnection } from './native-harness-tools.ts';
import type { NativeAttachment } from './native-attachments.mjs';
import type { NativeAccess, NativeApprovalDecision } from './native-approval-policy.ts';
export declare const NATIVE_TRANSPORTS: {
    readonly antigravity: "agy-stream-v1";
    readonly codex: "codex-app-v1";
    readonly claude: "claude-stream-v1";
    readonly kimi: "kimi-acp-v1";
    readonly mimo: "mimo-http-v1";
    readonly zcode: "zcode-app-v1";
    readonly grok: "grok-acp-v1";
    readonly omp: "omp-rpc-v1";
    readonly pi: "pi-rpc-v1";
    readonly hermes: "hermes-http-v1";
    readonly opencode: "opencode-http-v1";
    readonly qoder: "qoder-acp-v1";
    readonly qodercn: "qodercn-acp-v1";
};
export declare function transportFor(cli: CliId): string;
export declare function usesNativeBridge(worker: Pick<Worker, 'transport' | 'preference'>): boolean;
export declare function prepareNativeWorker<T extends {
    argv: string[];
    env?: Record<string, string>;
    cleanup?: () => Promise<void>;
}>(launch: T, input: {
    cli: CliId;
    project: string;
    preference: Preference;
    mode: TaskMode;
    prompt: string;
    attachments?: readonly NativeAttachment[];
    forkSource?: {
        conversationId: string;
        messageId: string;
    };
    conversationId?: string;
    stateDirectory: string;
    /** DSH sandbox snapshot for this run; absent keeps the historical workspace mapping. */
    access?: NativeAccess;
    /** Non-secret model IDs from the exact admitted Claude route. */
    claudeModelCandidates?: Array<{
        value: string;
        resolvedModel: string;
    }>;
    harnessTools?: NativeHarnessConnection;
}, config: RuntimeConfig): Promise<T & {
    cleanup: () => Promise<void>;
    steer?: ((message: string, requestId: string, signal?: AbortSignal) => Promise<void>) | undefined;
    argv: string[];
    answerApproval: (id: string, decision: NativeApprovalDecision) => Promise<void>;
    /** Pauses or resumes the runner's idle window for hold `key` (`idle-…`); each command has its own mailbox id. */
    holdIdle: (key: string, state: "hold" | "release") => Promise<void>;
    env: {
        ELECTRON_RUN_AS_NODE: string;
    };
    stop: () => Promise<void>;
}>;
