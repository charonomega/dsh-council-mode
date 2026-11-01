import { useEffect, useState } from 'react';
export const value = (result) => {
    if (!result.ok)
        throw new Error(result.error.message);
    return result.value;
};
const empty = (workers = []) => ({ workers, timeline: [], revision: 0, truncated: false });
export function useWorkers(api, session, selected = '') {
    const key = JSON.stringify([session, selected]);
    const [attempt, retry] = useState(0);
    const [state, setState] = useState(() => ({ key, session, snapshot: empty(), error: '', connecting: true }));
    useEffect(() => {
        let alive = true;
        setState((old) => ({
            key,
            session,
            snapshot: old.key === key ? old.snapshot : empty(old.session === session ? old.snapshot.workers : []),
            error: '',
            connecting: true,
        }));
        const stream = api.$stream({
            name: `CLI Worker ${session}`,
            open: (signal) => api.cliworker.watch(session, selected, signal),
            ended: () => new Error('连接已结束'),
        });
        void (async () => {
            try {
                for await (const item of stream) {
                    const snapshot = JSON.parse(item.value);
                    if (snapshot.selected && snapshot.selected.id !== selected)
                        throw new Error('收到不匹配的任务记录');
                    if (alive)
                        setState({ key, session, snapshot, error: '', connecting: false });
                    item.accept();
                }
                if (alive)
                    throw new Error('连接已结束');
            }
            catch (error) {
                if (alive)
                    setState((old) => ({ ...old, error: String(error), connecting: false }));
            }
        })();
        return () => {
            alive = false;
            void stream.dispose().catch(() => undefined);
        };
    }, [api, session, selected, key, attempt]);
    // React effects run after paint: never show the previous worker during that gap.
    const current = state.key === key
        ? state
        : {
            snapshot: empty(state.session === session ? state.snapshot.workers : []),
            error: '',
            connecting: true,
        };
    return { ...current, reconnect: () => retry((n) => n + 1) };
}
//# sourceMappingURL=workers.js.map