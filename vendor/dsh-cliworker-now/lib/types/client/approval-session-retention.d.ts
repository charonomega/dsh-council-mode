import type { Context } from '@deepseek-ai/cordis';
import type { Worker } from '../shared/types.ts';
declare module '@deepseek-ai/dsh-api-session-controller/client' {
    interface SessionReferenceSourceMap {
        cliworkerApproval: unknown;
    }
}
/**
 * DSH answers a Worker-UI turn's authorization request only for a native child
 * session this Client holds. Hold every running Worker's child while the CLI
 * Worker pane is mounted, so the native approval panel can appear in that
 * Worker's conversation even when the user is viewing another one.
 */
export declare function ApprovalSessionRetention({ services, parentSessionId, workers, }: {
    services: Pick<Context, 'sessions'>;
    parentSessionId: string;
    workers: readonly Worker[];
}): null;
