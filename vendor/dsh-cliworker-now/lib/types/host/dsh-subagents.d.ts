import { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SubagentRuntime, SubagentTimingProjection, SubagentPromptRequest } from '@deepseek-ai/dsh-subagent';
import { type DshSubagent } from '../shared/types.ts';
/** Narrow public SessionQuery observation; reading projections never copies the log. */
export interface DshObservation extends Disposable {
    header: {
        origin?: string;
        parentSession?: string;
    };
    cursor: number;
    projections?: {
        values: {
            subagentTiming?: SubagentTimingProjection;
            modelSelection?: {
                next: {
                    model: string;
                } | null;
                lastUsed: {
                    model: string;
                } | null;
            };
        };
    };
}
export interface DshSubagentServices {
    subagents(): Pick<SubagentRuntime, 'listChildren' | 'prompt' | 'interruptByParent'> | undefined;
    query(): {
        observeSession(id: SessionId, options: {
            signal: AbortSignal;
        }): Promise<DshObservation>;
    } | undefined;
    ownedSessions(): ReadonlySet<string>;
    /** Undefined means this host has no public event source. */
    subscribe?(notify: (sessionId: string) => void): () => void;
    log(reason: string): void;
}
export declare function dshStatus(timing?: SubagentTimingProjection): DshSubagent['status'];
/** Native children remain DSH-owned. Only the hidden directory is written here. */
export declare class DshSubagents {
    private directory;
    private services;
    private hidden?;
    private names?;
    private lifetime;
    private listeners;
    private cleanups;
    private stopped;
    private warned;
    constructor(directory: string, services: DshSubagentServices);
    private warn;
    private readHidden;
    private readNames;
    private persist;
    /** Stable `dsh-N` per main conversation in creation order; hidden children keep theirs so names never move. */
    private nameChildren;
    private catalog;
    private projection;
    list(parent: string, caller: AbortSignal): Promise<DshSubagent[]>;
    private requireChild;
    prompt(request: SubagentPromptRequest, caller: AbortSignal): Promise<import("@deepseek-ai/dsh-subagent").SubagentPromptReceipt>;
    /** Exact `dsh-N` (case-insensitive) or child ID among this conversation's visible native children. */
    resolve(parent: string, ref: {
        id?: string;
        name?: string;
    }, caller: AbortSignal): Promise<{
        id: SessionId;
        agentName: string;
        mode: "unknown" | "continuable" | "one-shot" | "external";
        title: string;
    } | undefined>;
    /** Main-agent follow-up by name. The reply arrives through DSH's own child→parent message. */
    followup(parent: string, ref: {
        id?: string;
        name?: string;
    }, text: string, caller: AbortSignal): Promise<{
        kind: "dsh-subagent";
        workerId: SessionId;
        agentName: string;
        title: string;
        receipt: import("@deepseek-ai/dsh-subagent").SubagentPromptReceipt;
        guidance: string;
    } | undefined>;
    hide(parent: string, id: string, caller: AbortSignal): Promise<void>;
    stop(parent: string, id: string, caller: AbortSignal): Promise<{
        stopped: true;
    }>;
    /** The client owns this stream only while its panel/document is visible. */
    watch(parent: string, caller: AbortSignal): AsyncIterable<string>;
    dispose(): void;
}
