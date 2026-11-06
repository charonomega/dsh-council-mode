import { ZCodeProtocol } from './zcode-adapter.ts';
import { HermesProtocol } from './hermes-adapter.ts';
import { GrokProtocol } from './grok-adapter.ts';
import { OpenCodeProtocol } from './opencode-adapter.ts';
import { BridgeProtocol } from './bridge-protocol.ts';
import { type CliId, type ModelChoice, type Preference, type TaskMode } from '../shared/types.ts';
import { AgyProtocol, type EventInput } from './protocol.ts';
import { CliProtocol } from './cli-protocol.ts';
import type { NativeAccess } from './native-approval-policy.ts';
import { type ProcessBackend, type RuntimeConfig } from './process.ts';
export interface Catalog {
    cli: CliId;
    models: ModelChoice[];
    notice: string;
}
export declare const executableFor: (cli: CliId, config: RuntimeConfig) => string;
/** Read-only discovery with bounded output. Never persist or expose provider credentials. */
export declare function captureCatalogMetadata(backend: ProcessBackend, config: RuntimeConfig, argv: string[], cwd: string, signal: AbortSignal, env?: Record<string, string>, allowedExitCodes?: readonly number[]): Promise<string>;
export declare function catalogFor(cli: CliId, backend: ProcessBackend, config: RuntimeConfig, cwd: string, signal: AbortSignal): Promise<Catalog>;
/** Official models --verbose prints provider/model followed by a pretty JSON object. */
export declare function parseMimoModels(output: string): ModelChoice[];
export declare function validatePreference(preference: Preference, catalog: Catalog): void;
export declare function workerArguments(executable: string, project: string, preference: Preference, mode: TaskMode, prompt: string, timeoutMs: number, conversationId?: string, nativeTransport?: boolean, 
/** DSH permission tier for this run; absent keeps the historical workspace mapping. */
access?: NativeAccess): string[];
export declare function protocolFor(cli: CliId, emit: (event: EventInput) => void, identify: (id: string) => void, maxLineBytes: number, expectedModel?: string): AgyProtocol | OpenCodeProtocol | HermesProtocol | ZCodeProtocol | GrokProtocol | BridgeProtocol | CliProtocol;
export declare function configuredCliExecutable(cli: CliId, config: RuntimeConfig): string | undefined;
/** Reuse a verified location; discovery never overwrites a later manual choice. */
export declare function resolveCliExecutable(cli: CliId, backend: ProcessBackend, config: RuntimeConfig, signal?: AbortSignal): Promise<string>;
