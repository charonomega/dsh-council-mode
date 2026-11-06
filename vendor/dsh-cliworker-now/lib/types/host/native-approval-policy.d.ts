/**
 * CLI permission tier and authorization decisions derived from the parent
 * conversation's DSH permission state. Pure: callers read DSH services.
 */
import type { TaskMode, WorkerLevel } from '../shared/types.ts';
/** DSH sandbox modes; also the CLI access tier a run is launched with. */
export type NativeAccess = 'read-only' | 'workspace-write' | 'danger-full-access';
export type ApprovalPolicy = 'ask' | 'never';
/** Who started this run: the parent model's tool call, or the user in the Worker UI. */
export type RunOrigin = 'agent' | 'user';
export interface NativeApprovalRequest {
    kind: 'command' | 'file' | 'network' | 'permission' | 'tool' | 'other';
    summary: string;
    detail?: string;
    /** The CLI natively offers a session-wide grant for this request. */
    allowSession: boolean;
}
export type ApprovalDecisionSource = 'user' | 'full-access' | 'plan' | 'preset' | 'unavailable' | 'stopped' | 'invalid';
export interface NativeApprovalDecision {
    decision: 'allow-once' | 'allow-session' | 'deny';
    source: ApprovalDecisionSource;
}
/** Host-side check of a runner frame (mirrors the runner's own bound). */
export declare function parseNativeApprovalRequest(value: unknown): NativeApprovalRequest;
/** The parent conversation's permission state at one moment. */
export interface PermissionState {
    /** Harness plan mode on the parent conversation. */
    planMode: boolean;
    sandbox: NativeAccess;
    approval: ApprovalPolicy;
}
/**
 * The access tier a run starts with. Plan wins; otherwise the level the user
 * chose for this Worker, or the parent's tier when there is none.
 */
export declare function runAccess(mode: TaskMode, level: WorkerLevel | undefined, state: PermissionState): NativeAccess;
/**
 * The DSH approval policy a Worker runs under. Full access keeps the parent's
 * policy when the parent is full too; a Worker the user set to full under a
 * lower parent never asks, as 完全权限 promises. Lower tiers ask.
 */
export declare function workerApproval(access: NativeAccess, state: PermissionState): ApprovalPolicy;
/**
 * Decide one request from the state current when it arrives. `ask` means the
 * user must answer; every other outcome is final and shows no prompt. A Worker
 * at its first item always asks: the user chose to be asked.
 */
export declare function decideApproval(mode: TaskMode, level: WorkerLevel | undefined, state: PermissionState): NativeApprovalDecision | 'ask';
export declare const ACCESS_LABELS: Record<NativeAccess, string>;
export declare const APPROVAL_OPTIONS: {
    readonly once: "允许一次";
    readonly session: "本会话始终允许";
    readonly deny: "拒绝";
};
/** Timeline text for one decision. */
export declare function approvalDecisionText(decision: NativeApprovalDecision): string;
/** Worker approval panel copy; the panel shows it as plain text. */
export declare function approvalPrompt(request: NativeApprovalRequest, context: {
    worker: string;
    cli: string;
    project: string;
}): string;
/**
 * Untrusted text as one literal Markdown paragraph: every ASCII punctuation is
 * escaped, so nothing becomes a link, format or HTML, and each line keeps a hard break.
 */
export declare function literalMarkdown(text: string): string;
/**
 * Parent-page question: offers a session grant only when the CLI natively has one.
 * The card's title collapses line breaks; only `detail` is laid out as paragraphs.
 */
export declare function approvalQuestion(request: NativeApprovalRequest, context: {
    worker: string;
    cli: string;
    project: string;
}): {
    id: string;
    header: string;
    question: string;
    detail: string;
    options: ({
        label: "允许一次";
    } | {
        label: "本会话始终允许";
    } | {
        label: "拒绝";
    })[];
};
/** Map a question answer; anything but an offered allow label is a denial. */
export declare function decisionFromAnswer(request: NativeApprovalRequest, answer: {
    selected: readonly string[];
    custom?: string;
} | undefined): NativeApprovalDecision;
export type ApprovalOutcome = 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable';
/** Map a DSH approval outcome from the Worker's native panel. */
export declare function decisionFromOutcome(outcome: ApprovalOutcome): NativeApprovalDecision;
/** Map a decision back to the DSH outcome a tool bridge request is waiting for. */
export declare function outcomeFromDecision(decision: NativeApprovalDecision): ApprovalOutcome;
/**
 * Summary of one DSH tool approval raised through the tool bridge. DSH sends
 * the reason but not the command, so the command comes from the call itself.
 * DSH has no session-wide grant.
 */
export declare function harnessApprovalRequest(name: string, args: unknown, reason: {
    reason?: string;
    displayReason?: {
        readonly [locale: string]: string;
    };
}): NativeApprovalRequest;
