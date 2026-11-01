import { type CliId, type Worker } from './types.ts';
/** Harness conversation features bridged onto a CLI Worker conversation. */
export type BridgedConversationFeature = 'goal' | 'plan' | 'feedback' | 'fork' | 'forkEarlier';
export interface BridgedFeatureSupport {
    supported: boolean;
    /** Shown as the hover tooltip when the control is disabled. */
    reason?: string;
}
/** Plugin-owned persistent objective. It is injected into each turn; it never starts a turn by itself. */
export interface WorkerGoal {
    objective: string;
    status: 'active' | 'paused';
    revision: number;
    updatedAt: string;
}
export declare const GOAL_OBJECTIVE_LIMIT = 4000;
/**
 * Native fork evidence per CLI (see openspec/changes/bridge-conversation-features/design.md).
 * `latest`: fork after the latest completed turn. `earlier`: fork at an earlier completed turn.
 */
export declare const forkSupport: Partial<Record<CliId, {
    latest: boolean;
    earlier: boolean;
}>>;
export declare const noForkReason: Partial<Record<CliId, string>>;
export declare function bridgedFeatureSupport(worker: Pick<Worker, 'preference' | 'transport'>): Record<BridgedConversationFeature, BridgedFeatureSupport>;
