import { SessionSeq } from '@deepseek-ai/dsh-session';
import { z } from 'zod';
const inboxSchema = z.object({
    'next-turn': z.array(z.unknown()),
    'next-step': z.array(z.unknown()),
});
const turnSchema = z.object({
    openTurnStartSeq: z.number().int().nonnegative().transform(SessionSeq).nullable(),
});
const planSchema = z.object({
    active: z.boolean(),
    wanted: z.boolean().nullable(),
    running: z.object({ wanted: z.boolean() }).nullable(),
});
/** Fail closed before changing a cold session if a host projection is missing or incompatible. */
export function readNativeColdSessionState(inbox, turn, plan) {
    const parsedInbox = inboxSchema.safeParse(inbox);
    const parsedTurn = turnSchema.safeParse(turn);
    const parsedPlan = planSchema.safeParse(plan);
    if (!parsedInbox.success || !parsedTurn.success || !parsedPlan.success)
        throw new Error('原生历史会话投影尚未就绪或格式不兼容，未修改权限');
    return { inbox: parsedInbox.data, turn: parsedTurn.data, plan: parsedPlan.data };
}
//# sourceMappingURL=native-cold-session-state.js.map