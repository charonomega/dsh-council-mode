import { useEffect, useState } from 'react';
import { setLanguagePreference, t } from "./i18n.js";
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
            ended: () => new Error(t('连接已结束')),
        });
        void (async () => {
            try {
                for await (const item of stream) {
                    const snapshot = JSON.parse(item.value);
                    setLanguagePreference(snapshot.language);
                    if (snapshot.selected && snapshot.selected.id !== selected)
                        throw new Error(t('收到不匹配的任务记录'));
                    if (alive)
                        setState({ key, session, snapshot, error: '', connecting: false });
                    item.accept();
                }
                if (alive)
                    throw new Error(t('连接已结束'));
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
/** Separate failure domain: a missing native service cannot break the Worker stream. */
export function useDshSubagents(api, session, enabled) {
    const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
    const [attempt, retry] = useState(0);
    const [state, setState] = useState({ session, rows: [] });
    useEffect(() => {
        if (typeof document === 'undefined')
            return;
        const changed = () => setVisible(document.visibilityState !== 'hidden');
        document.addEventListener('visibilitychange', changed);
        return () => document.removeEventListener('visibilitychange', changed);
    }, []);
    useEffect(() => {
        if (!enabled || !visible)
            return;
        const controller = new AbortController();
        const accept = (raw) => {
            const rows = JSON.parse(raw);
            if (!Array.isArray(rows) || rows.some((row) => row.parentSessionId !== session))
                throw new Error(t('DSH 子 Agent 列表暂时不可用'));
            if (!controller.signal.aborted)
                setState({ session, rows });
        };
        const failed = () => { if (!controller.signal.aborted)
            setState({ session, rows: [], error: t('DSH 子 Agent 列表暂时不可用') }); };
        let dispose;
        let timer;
        if (api.cliworker.watchDshSubagents) {
            const stream = api.$stream({
                name: `DSH subagents ${session}`,
                open: (signal) => api.cliworker.watchDshSubagents(session, signal),
                ended: () => new Error(t('连接已结束')),
            });
            dispose = () => { void stream.dispose().catch(() => undefined); };
            void (async () => {
                try {
                    for await (const item of stream) {
                        accept(item.value);
                        item.accept();
                    }
                    if (!controller.signal.aborted)
                        failed();
                }
                catch {
                    failed();
                }
            })();
        }
        else if (api.cliworker.listDshSubagents) {
            const poll = async () => {
                try {
                    accept(value(await api.cliworker.listDshSubagents(session, controller.signal)));
                }
                catch {
                    failed();
                }
                if (!controller.signal.aborted)
                    timer = setTimeout(() => { void poll(); }, 2000);
            };
            void poll();
        }
        return () => { controller.abort(); dispose?.(); clearTimeout(timer); };
    }, [api, session, enabled, visible, attempt]);
    return { rows: enabled && state.session === session ? state.rows : [],
        error: enabled && state.session === session ? state.error : undefined,
        refresh: () => retry((n) => n + 1) };
}
export function filterDshSubagents(rows, query, filter) {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => `DSH ${row.agentName ?? ''} ${row.name} ${row.model ?? ''}`.toLowerCase().includes(search) &&
        (filter === 'all' || (filter === 'active' ? row.status === 'running'
            : filter === 'completed' ? row.status === 'completed' : row.status === 'failed' && !row.stopped)));
}
//# sourceMappingURL=workers.js.map