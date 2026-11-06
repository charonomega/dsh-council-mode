import type { InboxState, TurnBoundaryProjection } from '@deepseek-ai/dsh-agent/types';
import type { PlanUnitState } from '@deepseek-ai/dsh-plan-mode/types';
type ColdInbox = {
    [K in keyof InboxState]: Pick<InboxState[K], 'length'>;
};
type ColdPlan = Pick<PlanUnitState, 'active' | 'wanted'> & {
    running: Pick<NonNullable<PlanUnitState['running']>, 'wanted'> | null;
};
/** Fail closed before changing a cold session if a host projection is missing or incompatible. */
export declare function readNativeColdSessionState(inbox: unknown, turn: unknown, plan: unknown): {
    inbox: ColdInbox;
    turn: Pick<TurnBoundaryProjection, "openTurnStartSeq">;
    plan: ColdPlan;
};
export {};
