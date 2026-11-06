import { type ModelChoice, type TaskMode } from '../shared/types.ts';
import { type PiOmpNativeOptions } from './pi-omp-native.ts';
import type { NativeHarnessConnection } from './native-harness-tools.ts';
import type { NativeAttachment } from './native-attachments.mjs';
import type { NativeAccess, NativeApprovalDecision } from './native-approval-policy.ts';
export type PiOmpCli = 'pi' | 'omp';
export type PiOmpMetadataPhase = 'native-candidates' | 'account-scope';
export type PiOmpMetadataCapture = (argv: string[], env?: Record<string, string>, phase?: PiOmpMetadataPhase, scope?: {
    leaseDirectory?: string;
}) => Promise<string>;
export interface PiOmpInput extends PiOmpNativeOptions {
    maxLineBytes?: number;
    maxRunBytes?: number;
    maxNativeLineBytes?: number;
    maxToolPreviewBytes?: number;
    managedCredentials?: boolean;
    cli: PiOmpCli;
    executable: string;
    project: string;
    preference: {
        model: string;
        effort: string;
    };
    mode: TaskMode;
    /** The Worker's effective level; below full access Pi asks through its tool_call gate. */
    access?: NativeAccess;
    prompt: string;
    attachments?: readonly NativeAttachment[];
    conversationId?: string;
    stateDirectory: string;
    harnessTools?: NativeHarnessConnection;
}
/** The bridge validates exact native model capabilities before sending any prompt. */
export declare function preparePiOmp(input: PiOmpInput, capture?: PiOmpMetadataCapture): Promise<{
    argv: string[];
    env?: Record<string, string>;
    leaseDirectory?: string;
    activate: () => Promise<void>;
    cleanup: () => Promise<void>;
    steer?: (message: string, requestId: string, signal?: AbortSignal) => Promise<void>;
    stop?: () => Promise<void>;
    answerApproval?: (id: string, decision: NativeApprovalDecision) => Promise<void>;
}>;
export declare function discoverPiOmp(cli: PiOmpCli, executable: string, capture: PiOmpMetadataCapture, stateDirectory: string, options?: PiOmpNativeOptions & {
    managedCredentials?: boolean;
}): Promise<ModelChoice[]>;
