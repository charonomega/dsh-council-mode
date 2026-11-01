import { type ModelChoice, type TaskMode } from '../shared/types.ts';
import { type PiOmpNativeOptions } from './pi-omp-native.ts';
import type { NativeHarnessConnection } from './native-harness-tools.ts';
import type { NativeAttachment } from './native-attachments.mjs';
export type PiOmpCli = 'pi' | 'omp';
export type PiOmpMetadataPhase = 'native-candidates' | 'account-scope';
export type PiOmpMetadataCapture = (argv: string[], env?: Record<string, string>, phase?: PiOmpMetadataPhase, scope?: {
    leaseDirectory?: string;
}) => Promise<string>;
export interface PiOmpInput extends PiOmpNativeOptions {
    managedCredentials?: boolean;
    cli: PiOmpCli;
    executable: string;
    project: string;
    preference: {
        model: string;
        effort: string;
    };
    mode: TaskMode;
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
}>;
export declare function discoverPiOmp(cli: PiOmpCli, executable: string, capture: PiOmpMetadataCapture, stateDirectory: string, options?: PiOmpNativeOptions & {
    managedCredentials?: boolean;
}): Promise<ModelChoice[]>;
