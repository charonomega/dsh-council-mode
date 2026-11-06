/* Client-side stores and hooks for Council Mode. */

let cliworkerApi = null;
const apiListeners = new Set();

function setCliWorkerApi(next) {
  cliworkerApi = next;
  for (const listener of apiListeners) listener();
}

function subscribeApi(listener) {
  apiListeners.add(listener);
  return () => apiListeners.delete(listener);
}

function useCliWorkerApi() {
  return React.useSyncExternalStore(subscribeApi, () => cliworkerApi, () => null);
}

function useObservable(source) {
  const subscribe = React.useCallback(
    (listener) => (source ? source.subscribe(listener) : () => {}),
    [source],
  );
  const read = React.useCallback(() => (source ? source.getSnapshot() : undefined), [source]);
  return React.useSyncExternalStore(subscribe, read, () => undefined);
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function useDarkTheme() {
  const read = () =>
    typeof document !== 'undefined' && document.body
      ? document.body.hasAttribute('data-ds-dark-theme')
      : false;
  const [dark, setDark] = React.useState(read);
  React.useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => setDark(read()));
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
    setDark(read());
    return () => observer.disconnect();
  }, []);
  return dark;
}

function streamOptions(name, open) {
  return {
    name,
    open,
    ended: () => new Error('CLI Worker stream ended'),
  };
}

async function readHistoryPage(api, sessionId, workerId, anchor) {
  try {
    if (typeof api?.cliworker?.history !== 'function') return undefined;
    const result = await api.cliworker.history(sessionId, workerId, anchor, 'before');
    if (!result || result.ok !== true) return undefined;
    return JSON.parse(result.value);
  } catch {
    return undefined;
  }
}

/** Walk the CLI Worker history backwards from the live snapshot's oldest row. */
async function loadOlderTimeline({ api, sessionId, workerId, state, initial, alive, update }) {
  if (typeof api?.cliworker?.history !== 'function') {
    state.complete = false;
    state.paused = true;
    state.error = '当前 CLI Worker 版本不提供历史接口，早期消息暂不可用。';
    return;
  }
  let anchor = state.items[0]?.id ?? initial[0]?.id;
  for (let pageIndex = 0; pageIndex < 20 && anchor; pageIndex += 1) {
    if (!alive()) return;
    const page = await readHistoryPage(api, sessionId, workerId, anchor);
    if (!alive()) return;
    if (!page) {
      state.complete = false;
      state.paused = true;
      return;
    }
    const items = Array.isArray(page.items) ? page.items : [];
    if (items.length === 0) {
      state.complete = true;
      return;
    }
    state.items = mergeTimelineItems(items, state.items);
    if (!alive()) return;
    update(state.items);
    if (!page.hasOlder) {
      state.complete = true;
      return;
    }
    anchor = items[0]?.id;
  }
  state.complete = false;
  state.paused = true;
}

/** Live roster for one parent session (workers and archived workers). */
function useRosterStream(api, sessionId, enabled) {
  const [state, setState] = React.useState({ snapshot: undefined, error: '', connecting: true });
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    if (!api || !enabled || !sessionId) {
      setState({ snapshot: undefined, error: '', connecting: false });
      return undefined;
    }
    let alive = true;
    let stream;
    setState((old) => ({ ...old, connecting: true }));
    try {
      stream = api.remote.$stream(
        streamOptions(`council roster ${sessionId}`, (signal) =>
          api.cliworker.watch(sessionId, '', signal),
        ),
      );
    } catch (error) {
      setState({ snapshot: undefined, error: String(error), connecting: false });
      return undefined;
    }
    (async () => {
      try {
        for await (const item of stream) {
          if (!alive) return;
          const snapshot = JSON.parse(item.value);
          setState({ snapshot, error: '', connecting: false });
          item.accept();
        }
        if (alive) setState((old) => ({ ...old, connecting: false, error: '连接已结束' }));
      } catch (error) {
        if (alive) setState((old) => ({ ...old, connecting: false, error: String(error) }));
      }
    })();
    return () => {
      alive = false;
      stream.dispose().catch(() => {});
    };
  }, [api, sessionId, enabled, attempt]);
  return {
    ...state,
    workers: state.snapshot?.workers ?? [],
    archivedWorkers: state.snapshot?.archivedWorkers ?? [],
    reconnect: () => setAttempt((value) => value + 1),
  };
}

/** One watch stream per enrolled member, keyed by worker id. */
function useMemberStreams(api, sessionId, members, enabled) {
  const [timelines, setTimelines] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const [attempt, setAttempt] = React.useState(0);
  const membersRef = React.useRef(members);
  membersRef.current = members;
  const historyRef = React.useRef(new Map());
  const historySourceRef = React.useRef({ sessionId, api });
  const key = (members ?? []).map((member) => member.workerId).join('|');

  React.useEffect(() => {
    if (historySourceRef.current.sessionId !== sessionId || historySourceRef.current.api !== api) {
      historyRef.current.clear();
      historySourceRef.current = { sessionId, api };
      setTimelines({});
      setErrors({});
    }
    const currentIds = new Set((membersRef.current ?? []).filter((member) => member.kind !== 'subagent').map((member) => member.workerId));
    // Each effect owns its loading state. A disposed stream may still have an
    // uncancellable history request in flight when a new API generation starts.
    for (const [id, state] of historyRef.current) {
      if (!currentIds.has(id)) historyRef.current.delete(id);
      else historyRef.current.set(id, { ...state, loading: false, paused: false, error: '' });
    }
    setTimelines((old) => Object.fromEntries(Object.entries(old).filter(([id]) => currentIds.has(id))));
    setErrors((old) => Object.fromEntries(Object.entries(old).filter(([id]) => currentIds.has(id))));
    if (!api || !enabled || !sessionId || key === '') return undefined;
    let alive = true;
    const streams = [];
    for (const member of membersRef.current) {
      if (!member || !member.workerId || member.kind === 'subagent') continue;
      let stream;
      try {
        stream = api.remote.$stream(
          streamOptions(`council member ${member.workerId}`, (signal) =>
            api.cliworker.watch(sessionId, member.workerId, signal),
          ),
        );
      } catch (error) {
        setErrors((old) => ({ ...old, [member.workerId]: String(error) }));
        continue;
      }
      streams.push(stream);
      (async () => {
        try {
          for await (const item of stream) {
            if (!alive) return;
            const snapshot = JSON.parse(item.value);
            const historyState =
              historyRef.current.get(member.workerId) ?? { items: [], complete: false, loading: false };
            historyRef.current.set(member.workerId, historyState);
            const merged = mergeTimelineItems(historyState.items, snapshot.timeline ?? []);
            historyState.items = merged;
            setTimelines((old) => ({
              ...old,
              [member.workerId]: { ...snapshot, timeline: merged },
            }));
            if (snapshot.truncated && !historyState.complete && !historyState.loading && !historyState.paused) {
              historyState.loading = true;
              void loadOlderTimeline({
                api,
                sessionId,
                workerId: member.workerId,
                state: historyState,
                initial: snapshot.timeline ?? [],
                alive: () => alive,
                update: (items) => {
                  if (!alive) return;
                  setTimelines((old) => {
                    const current = old[member.workerId];
                    if (!current) return old;
                    return {
                      ...old,
                      [member.workerId]: {
                        ...current,
                        timeline: mergeTimelineItems(items, current.timeline ?? []),
                      },
                    };
                  });
                },
              }).finally(() => {
                historyState.loading = false;
                if (alive && historyState.paused) setErrors((old) => ({ ...old, [member.workerId]: historyState.error || '更早历史尚未加载完；点击重连继续加载。' }));
              });
            }
            setErrors((old) => {
              if (historyState.paused || !(member.workerId in old)) return old;
              const next = { ...old };
              delete next[member.workerId];
              return next;
            });
            item.accept();
          }
        } catch (error) {
          if (alive) setErrors((old) => ({ ...old, [member.workerId]: String(error) }));
        }
      })();
    }
    return () => {
      alive = false;
      for (const stream of streams) stream.dispose().catch(() => {});
    };
  }, [api, sessionId, key, enabled, attempt]);

  const error = Object.values(errors)[0] ?? '';
  return {
    timelines,
    error,
    reconnect: () => {
      setErrors({});
      setAttempt((value) => value + 1);
    },
  };
}

/** Subscribe to the chat targets of native DSH subagent members. */
function useSubagentChats(members, getChat, presence = '', parentSessionId) {
  const [snapshots, setSnapshots] = React.useState({});
  const [errors, setErrors] = React.useState({});
  const subMembers = React.useMemo(
    () => (Array.isArray(members) ? members : []).filter(
      (member) => member && member.kind === 'subagent' && member.verifiedParentId === parentSessionId && parentSessionId && (member.sessionId || member.workerId),
    ),
    [members, parentSessionId],
  );
  const key = subMembers.map((member) => member.sessionId || member.workerId).join('|');
  const getChatRef = React.useRef(getChat);
  getChatRef.current = getChat;

  React.useEffect(() => {
    setSnapshots({});
    setErrors({});
    if (key === '') return undefined;
    let alive = true;
    const unsubscribers = [];
    const releases = [];
    setErrors({});
    for (const member of subMembers) {
      const childId = member.sessionId || member.workerId;
      let source;
      try {
        source = getChatRef.current?.(childId);
      } catch (error) {
        source = undefined;
        setErrors((old) => ({ ...old, [childId]: String(error) }));
      }
      if (!source?.reference || !source.ready) {
        setErrors((old) => ({ ...old, [childId]: '无法打开原生子智能体会话' }));
        continue;
      }
      const reference = source.reference;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        try {
          reference.release();
        } catch {
          /* ignore */
        }
      };
      releases.push(release);
      source.ready
        .then(({ chat, loadImage }) => {
          if (!alive || released || !chat || typeof chat.getSnapshot !== 'function') {
            if (alive) setErrors((old) => ({ ...old, [childId]: '原生子智能体的 chat target 不可用' }));
            release();
            return;
          }
          const read = () => {
            if (!alive || released) return;
            setSnapshots((old) => ({
              ...old,
              [childId]: {
                chat: chat.getSnapshot(),
                loadImage,
                cwd: source.cwd,
                member,
              },
            }));
          };
          read();
          if (typeof chat.subscribe === 'function') unsubscribers.push(chat.subscribe(read));
        })
        .catch((error) => {
          if (alive) setErrors((old) => ({ ...old, [childId]: String(error) }));
          release();
        });
    }
    return () => {
      alive = false;
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        } catch {
          /* ignore */
        }
      }
      for (const release of releases) release();
    };
  }, [key, presence, parentSessionId]);

  return { snapshots, errors };
}

function useChatSnapshot(chat) {
  return useObservable(chat);
}

async function executeCommand(ctx, sessionId, line) {
  try {
    const result = await ctx.remote.commands.execute(sessionId, line, []);
    if (!result.ok) return result.error?.message ?? '命令失败';
    if (result.value === undefined) return `未知命令：${line}`;
    const settled = result.value?.result ?? result.value;
    if (settled?.kind === 'error') return settled.text || '命令失败';
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function checkCliAvailability(api, sessionId, cli, signal) {
  if (!api) return { available: false, error: 'CLI Worker 未安装' };
  try {
    if (typeof api.cliworker.cliExecutablePath !== 'function') {
      return { available: false, error: '当前 CLI Worker 版本不支持路径检测' };
    }
    const result = await api.cliworker.cliExecutablePath(sessionId, cli, signal);
    if (!result.ok) return { available: false, error: result.error?.message ?? '检测失败' };
    const data = JSON.parse(result.value);
    return {
      available: data.available === true,
      error: data.error || '',
      path: data.path || '',
    };
  } catch (error) {
    return { available: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function openCliWorkerPanel(ctx) {
  try {
    const right = ctx.get('sidebarRight');
    if (!right || typeof right.openTab !== 'function') return false;
    right.openTab('dsh-cliworker-now');
    return true;
  } catch {
    return false;
  }
}

function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text ?? '')).catch(() => {});
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}


