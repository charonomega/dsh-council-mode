import { useEffect } from 'react';
/**
 * DSH answers a Worker-UI turn's authorization request only for a native child
 * session this Client holds. Hold every running Worker's child while the CLI
 * Worker pane is mounted, so the native approval panel can appear in that
 * Worker's conversation even when the user is viewing another one.
 */
export function ApprovalSessionRetention({ services, parentSessionId, workers, }) {
    const key = workers
        .filter((worker) => worker.status === 'running' && worker.harnessConversation?.parentSessionId === parentSessionId)
        .map((worker) => worker.harnessConversation.sessionId)
        .sort()
        .join('\n');
    useEffect(() => {
        if (!key)
            return;
        const controller = new AbortController();
        const held = [];
        for (const childSessionId of key.split('\n'))
            try {
                const reference = services.sessions.retain({
                    parentSessionId: parentSessionId,
                    childSessionId: childSessionId,
                    mode: 'continuable',
                }, { source: 'cliworkerApproval', signal: controller.signal });
                // Opening history may fail; the Worker conversation reports it, not this holder.
                void Promise.resolve(reference.ready).catch(() => undefined);
                held.push(reference);
            }
            catch {
                // Without a held session DSH resolves the request as unanswered (denied).
            }
        return () => {
            controller.abort();
            for (const reference of held)
                reference.release();
        };
    }, [services.sessions, parentSessionId, key]);
    return null;
}
//# sourceMappingURL=approval-session-retention.js.map