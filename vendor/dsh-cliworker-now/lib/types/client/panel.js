import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { DshSubagentCard } from "./dsh-subagents.js";
import { ComposerTelemetry } from "./telemetry.js";
import { HarnessLegacyHistory } from "./harness-legacy-history.js";
import { ConversationTimeline } from "./conversation-timeline.js";
import { displayModelName } from "../shared/model-presentation.js";
import { operationMessage } from "./operation-error.js";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Tooltip, StateDot, IconChevronDownOutlineRegular, IconTrashOutlineRegular, } from '@deepseek-ai/dsh-client-ui-primitives';
import { createComposerKeymap } from "./composer-keymap.js";
import { active, CLI_IDS, CLI_LABELS, isRetiredCli, isUserInterrupted, RETIRED_HARNESS_NOTICE, cliOf, workerName, } from "../shared/types.js";
import { useWorkers, useDshSubagents, filterDshSubagents, value } from "./workers.js";
import { CopyText } from "./copy-text.js";
import { BrandIcon, DshIcon, Glyph } from "./icons.js";
import { WorkerModelMenu } from "./worker-model-menu.js";
import { SettingsDialog } from "./settings-dialog.js";
import { RenameWorker } from "./rename-worker.js";
import { WorkerCard } from "./worker-card.js";
import { RUNNING_MESSAGE_LABELS } from "../shared/running-message.js";
import { useMessageSubmissions } from "./message-submissions.js";
import { FollowupQueuePresence } from "./followup-queue-presence.js";
import { HarnessCapabilityNotes } from "./harness-conversation.js";
import { t, useT } from "./i18n.js";
import { hostText } from "./operation-error.js";
const status = {
    queued: '排队中',
    running: '运行中',
    stopping: '正在停止',
    completed: '已完成',
    failed: '失败',
    uncertain: '结果待核实',
    interrupted: '已中断',
};
export function Panel(props) {
    useT();
    // In-memory only: project content is never copied into browser localStorage.
    const [drafts, setDrafts] = useState({});
    return (_jsx(SessionPanel, { ...props, drafts: drafts, editDraft: (id, text) => setDrafts((old) => ({ ...old, [id]: text })), clearSubmitted: (id, submitted) => setDrafts((old) => (old[id] === submitted ? { ...old, [id]: '' } : old)), restoreDraft: (id, text) => setDrafts((old) => (old[id] ? old : { ...old, [id]: text })) }, props.sessionId));
}
function SessionPanel({ visible = true, sessionId, api, openNativeSettings, renderHarnessConversation, renderDshConversation, renderSessionRetention, activeHarnessSessionId, drafts, editDraft, clearSubmitted, restoreDraft, }) {
    useT();
    const [selected, select] = useState('');
    const [selectedDsh, selectDsh] = useState();
    const [collapsed, setCollapsed] = useState({});
    const [collapsedFollowups, setCollapsedFollowups] = useState({});
    const cliGroupId = useId();
    const followupQueueId = useId();
    const overview = useRef(null), overviewScroll = useRef(0);
    const back = useRef(null), lastWorker = useRef('');
    useLayoutEffect(() => {
        if (selected || selectedDsh)
            back.current?.focus();
        else if (overview.current) {
            overview.current.scrollTop = overviewScroll.current;
            overview.current
                .querySelector(`[data-open-worker-id='${lastWorker.current}']`)
                ?.focus({ preventScroll: true });
        }
    }, [selected, selectedDsh?.id]);
    const openWorker = (id) => {
        lastWorker.current = id;
        setSettings(false);
        selectDsh(undefined);
        select(id);
    };
    const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [historyPage, setHistoryPage] = useState();
    const history = historyPage?.workerId === selected ? historyPage : undefined;
    const { snapshot, error: streamError, connecting, reconnect } = useWorkers(api, sessionId, selected);
    const showDsh = snapshot.showDshSubagents ?? true;
    const dsh = useDshSubagents(api, sessionId, showDsh && visible && !connecting);
    const dshChild = showDsh && selectedDsh ? dsh.rows.find((row) => row.id === selectedDsh.id) ?? selectedDsh : undefined;
    const visibleDsh = filterDshSubagents(dsh.rows, query, filter);
    useEffect(() => { if (!showDsh)
        selectDsh(undefined); }, [showDsh]);
    const seenActiveSession = useRef();
    useEffect(() => {
        if (!activeHarnessSessionId) {
            seenActiveSession.current = undefined;
            return;
        }
        if (!renderHarnessConversation || seenActiveSession.current === activeHarnessSessionId)
            return;
        const active = snapshot.workers.find((worker) => worker.harnessConversation?.sessionId === activeHarnessSessionId);
        if (active) {
            seenActiveSession.current = activeHarnessSessionId;
            selectDsh(undefined);
            select(active.id);
        }
    }, [activeHarnessSessionId, snapshot.workers, renderHarnessConversation]);
    const [errors, setErrors] = useState({}), [busy, setBusy] = useState(false);
    const error = errors[selected] ?? '';
    const setError = (text) => setErrors((old) => ({ ...old, [selected]: text }));
    const pendingAction = useRef(false);
    const pendingStop = useRef(new Set());
    const [stoppingWorkers, setStoppingWorkers] = useState(new Set());
    const stoppingRequest = stoppingWorkers.has(selected);
    const submissions = useMessageSubmissions(api, sessionId, snapshot, restoreDraft);
    const submittedDraft = useRef(new Map());
    const managementAbort = useRef();
    const [following, setFollowing] = useState(true);
    const alive = useRef(true), currentSelection = useRef(selected);
    currentSelection.current = selected;
    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            managementAbort.current?.abort();
        };
    }, []);
    // A task's 「默认设置」 opens its CLI; the header button opens 「CLI Worker 设置」.
    const [settingsCli, setSettingsCli] = useState();
    const [settings, setSettings] = useState(false);
    const [renaming, setRenaming] = useState();
    const [restartFor, setRestartFor] = useState('');
    const nativeSettingsRequested = useRef(false);
    useEffect(() => {
        // The native command must run after our Modal releases its focus/inert seat.
        if (!settings && nativeSettingsRequested.current) {
            nativeSettingsRequested.current = false;
            try {
                openNativeSettings?.();
            }
            catch {
                setError(t('无法打开原生设置。请从 Harness 左侧打开「设置 → 模型」管理 API 登录。'));
            }
        }
    }, [settings, openNativeSettings]);
    const feed = useRef(null), stick = useRef(true);
    const worker = snapshot.selected;
    const retired = !!worker && isRetiredCli(cliOf(worker.preference));
    const prompt = drafts[selected] ?? '';
    const composerInput = useRef(null);
    const composerForm = useRef(null);
    const submitEnabled = useRef(false);
    const composerKeys = useMemo(() => createComposerKeymap(() => submitEnabled.current, () => composerForm.current?.requestSubmit()), [selected]);
    useLayoutEffect(() => {
        const el = composerInput.current;
        if (!el)
            return;
        el.style.height = '36px';
        el.style.height = `${Math.max(36, Math.min(el.scrollHeight, 336))}px`;
    }, [prompt, selected, snapshot.selected?.id]);
    useEffect(() => {
        stick.current = true;
        setFollowing(true);
        setHistoryPage(undefined);
        setRestartFor('');
    }, [selected]);
    useEffect(() => {
        if (restartFor)
            composerInput.current?.focus({ preventScroll: true });
    }, [restartFor]);
    useEffect(() => {
        if (!history && stick.current && feed.current)
            feed.current.scrollTop = feed.current.scrollHeight;
    }, [snapshot.timeline, selected, history]);
    useEffect(() => {
        if (history && feed.current)
            feed.current.scrollTop = 0;
    }, [history]);
    async function perform(action) {
        if (pendingAction.current)
            return;
        pendingAction.current = true;
        const origin = selected;
        const isCurrent = () => alive.current && currentSelection.current === origin;
        setBusy(true);
        setError('');
        try {
            await action(isCurrent);
        }
        catch (e) {
            if (alive.current)
                setErrors((old) => ({ ...old, [origin]: operationMessage(e) }));
        }
        finally {
            pendingAction.current = false;
            if (alive.current)
                setBusy(false);
        }
    }
    async function stopWorker(target) {
        if (pendingStop.current.has(target.id) ||
            (target.status === 'stopping' && !submissions.interrupting && !submissions.stopUnconfirmed) ||
            unavailable)
            return;
        const stopScope = submissions.stopScope(target.id);
        pendingStop.current.add(target.id);
        setStoppingWorkers(new Set(pendingStop.current));
        setErrors((old) => ({ ...old, [target.id]: '' }));
        try {
            const preparation = submissions.cancelPending(target.id);
            // The Host confirms process cleanup; cancelling a browser RPC alone does not.
            const stopped = api.cliworker.stop(sessionId, target.id).then(value);
            submissions.waitForStop(target.id, stopped);
            const [, receipt] = await Promise.all([preparation, stopped]);
            if (receipt) {
                const result = JSON.parse(receipt);
                if (result.runId)
                    submissions.confirmStopped(target.id, result.runId, stopScope);
            }
        }
        catch (error) {
            if (alive.current)
                setErrors((old) => ({ ...old, [target.id]: operationMessage(error) }));
        }
        finally {
            pendingStop.current.delete(target.id);
            if (alive.current)
                setStoppingWorkers(new Set(pendingStop.current));
        }
    }
    const running = !!worker && (submissions.busyFor(worker.id) || stoppingRequest);
    const unavailable = connecting || !!streamError;
    const startingNew = !!worker && restartFor === worker.id;
    const resumeBlocked = snapshot.resumeBlockedReason;
    const queuedFollowups = [...submissions.hostQueue, ...submissions.optimisticQueue];
    const followupsExpanded = !collapsedFollowups[selected];
    const waitingForTurn = running;
    const userInterrupted = !!worker && isUserInterrupted(worker);
    const queueSubmission = !!waitingForTurn || queuedFollowups.some((item) => item.state !== 'paused');
    const workerModelMenu = worker && (_jsx(WorkerModelMenu, { worker: worker, api: api, sessionId: sessionId, disabled: retired ||
            busy ||
            unavailable ||
            !!running ||
            submissions.pending ||
            submissions.uncertain ||
            queuedFollowups.length > 0 ||
            startingNew ||
            !!resumeBlocked, disabledReason: queuedFollowups.length > 0
            ? t('请先发送或取消待发送消息，再修改模型与强度')
            : submissions.pending || submissions.uncertain
                ? t('请等待当前消息提交确认，再修改模型与强度')
                : undefined }, `model:${worker.id}`));
    const runningMessageMode = snapshot.runningMessageMode ?? 'queue';
    const submissionLabel = waitingForTurn
        ? runningMessageMode === 'queue'
            ? t('加入待发送消息')
            : t('{mode}发送', { mode: hostText(RUNNING_MESSAGE_LABELS[runningMessageMode]) })
        : queueSubmission
            ? t('加入待发送消息')
            : t('继续对话');
    const submissionHint = waitingForTurn
        ? runningMessageMode === 'steer'
            ? t('引导当前运行')
            : runningMessageMode === 'interrupt'
                ? t('停止当前轮后插队发送')
                : t('本轮结束后发送')
        : queueSubmission
            ? t('加入待发送消息')
            : t('继续对话');
    const canResume = (startingNew || ((waitingForTurn || worker?.conversationId || userInterrupted) && !resumeBlocked)) &&
        !retired &&
        (!startingNew || !running) &&
        !unavailable;
    submitEnabled.current =
        !!prompt.trim() && !!canResume && !busy && (!submissions.uncertain || runningMessageMode === 'interrupt');
    function submitPrompt(submittedText, selectedMode = runningMessageMode) {
        if (!worker)
            return false;
        if (!submittedText.trim() ||
            !canResume ||
            busy ||
            (submissions.uncertain && selectedMode !== 'interrupt'))
            return false;
        if (!startingNew) {
            if (submittedDraft.current.get(worker.id) === submittedText)
                return false;
            const occupied = submissions.busyFor(worker.id) || pendingStop.current.has(worker.id);
            if (occupied && selectedMode === 'steer' && !submissions.canSteer(worker.id)) {
                setError(t('当前运行尚未准备好接收引导，请保留消息后重试或选择其他发送方式。'));
                return false;
            }
            const sent = occupied && selectedMode === 'steer'
                ? submissions.steerMessage(worker, submittedText)
                : submissions.submit(worker, submittedText, occupied ? 'running' : queueSubmission ? 'queue' : 'followup', occupied ? selectedMode : 'queue');
            if (!sent)
                return false;
            submittedDraft.current.set(worker.id, submittedText);
            void sent.done.then(() => {
                if (sent.state !== 'accepted' && submittedDraft.current.get(worker.id) === submittedText)
                    submittedDraft.current.delete(worker.id);
            });
            clearSubmitted(worker.id, submittedText);
            setError('');
            jumpToLatest();
            return true;
        }
        void perform(async (isCurrent) => {
            const controller = new AbortController();
            managementAbort.current = controller;
            let receipt;
            try {
                receipt = JSON.parse(value(await api.cliworker.restartWorker(sessionId, worker.id, submittedText, controller.signal)));
            }
            finally {
                if (managementAbort.current === controller)
                    managementAbort.current = undefined;
            }
            if (!receipt.workerId || receipt.workerId === worker.id)
                throw new Error(t('新对话未返回有效的智能体记录'));
            clearSubmitted(worker.id, submittedText);
            if (isCurrent()) {
                lastWorker.current = receipt.workerId;
                setRestartFor('');
                select(receipt.workerId);
            }
        });
        return false;
    }
    const jumpToLatest = () => {
        setHistoryPage(undefined);
        stick.current = true;
        setFollowing(true);
        if (feed.current)
            feed.current.scrollTop = feed.current.scrollHeight;
    };
    const visibleWorkers = snapshot.workers.filter((w) => {
        const matches = `${CLI_LABELS[cliOf(w.preference)]} ${workerName(w)} ${w.title} ${w.preference.model} ${w.preference.effort}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());
        return (matches &&
            (filter === 'all' ||
                (filter === 'active'
                    ? active(w.status)
                    : filter === 'attention'
                        ? w.status === 'failed' ||
                            (w.status === 'interrupted' && !isUserInterrupted(w)) ||
                            w.status === 'uncertain'
                        : w.status === 'completed')));
    });
    const archivedWorkers = snapshot.archivedWorkers ?? [];
    const manageWorker = (target, action) => {
        if (action === 'name' || action === 'title') {
            setRenaming({ worker: target, mode: action });
            return;
        }
        void perform(async (isCurrent) => {
            const controller = new AbortController();
            managementAbort.current = controller;
            try {
                value(await api.cliworker.deleteWorker(sessionId, target.id, controller.signal));
            }
            finally {
                if (managementAbort.current === controller)
                    managementAbort.current = undefined;
            }
            if (isCurrent()) {
                if (selected === target.id)
                    select('');
                setShowArchived(true);
            }
        });
    };
    const latestTimeline = [...submissions.hostTimeline, ...submissions.optimisticTimeline];
    const displayedTimeline = history?.items ?? latestTimeline;
    const loadHistory = (direction) => {
        const anchor = direction === 'before' ? displayedTimeline[0]?.id : displayedTimeline.at(-1)?.id;
        if (!worker || !anchor)
            return;
        void perform(async (isCurrent) => {
            const page = JSON.parse(value(await api.cliworker.history(sessionId, worker.id, anchor, direction)));
            if (!isCurrent())
                return;
            if (page.workerId !== worker.id)
                throw new Error(t('收到不匹配的历史记录'));
            if (!page.items.length) {
                jumpToLatest();
                return;
            }
            stick.current = false;
            setFollowing(false);
            setHistoryPage(page);
        });
    };
    return (_jsxs("section", { className: "cwn", "aria-label": "CLI Worker Now", children: [renderSessionRetention?.(snapshot.workers), _jsx("header", { className: "cwn-head", children: selected || dshChild ? (_jsxs(_Fragment, { children: [_jsx(Tooltip, { label: t('返回子 Agent 列表'), side: "bottom", portal: true, children: _jsx(Button, { ref: back, type: "button", variant: "outline", size: "sm", className: "cwn-back", "aria-label": t('返回子 Agent 列表'), onClick: () => {
                                    setSettings(false);
                                    select('');
                                    selectDsh(undefined);
                                }, children: _jsx(Glyph, { name: "back" }) }) }), _jsx("h2", { title: worker ? `${workerName(worker)}｜${worker.title}` : undefined, children: (() => {
                                if (dshChild)
                                    return dshChild.name;
                                const current = worker ?? snapshot.workers.find((w) => w.id === selected);
                                return current ? `${workerName(current)}｜${current.title}` : t('正在加载…');
                            })() }), !dshChild && _jsxs("details", { className: "cwn-actions", children: [_jsx("summary", { "aria-label": t('任务选项'), title: t('任务选项'), children: _jsx(Glyph, { name: "more" }) }), _jsxs("div", { className: `cwn-action-menu${renderHarnessConversation ? ' cwn-native-action-menu' : ''}`, children: [worker && (_jsxs(_Fragment, { children: [_jsx("strong", { children: CLI_LABELS[cliOf(worker.preference)] }), _jsx("p", { children: worker.mode === 'plan' ? t('CLI 规划模式') : t('可编辑任务') }), worker.role && _jsx("p", { title: worker.role.summary, children: t('角色：{name}', { name: worker.role.name }) }), worker.harnessConversation && (_jsx(HarnessCapabilityNotes, { binding: worker.harnessConversation })), renderHarnessConversation && (_jsxs(_Fragment, { children: [workerModelMenu, _jsx(HarnessLegacyHistory, { api: api, parentSessionId: sessionId, worker: worker, items: snapshot.timeline, truncated: snapshot.truncated, queuedFollowups: snapshot.queuedFollowups }, `history:${worker.id}`)] })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => manageWorker(worker, 'name'), disabled: unavailable || busy, children: t('修改智能体名称') }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => manageWorker(worker, 'title'), disabled: unavailable || busy, children: t('修改聊天标题') }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => manageWorker(worker, 'delete'), disabled: unavailable || busy || !!running, children: t('删除') }), worker.observedModel && worker.observedModel !== worker.preference.model && (_jsxs("p", { children: [t('CLI 实际模型：'), displayModelName({ ...worker.preference, model: worker.observedModel })] })), worker.lastResult && (_jsx(CopyText, { text: worker.lastResult, label: t('复制最新结果') }, `${worker.id}:${worker.runId}`))] })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => {
                                                setSettingsCli(worker && !retired ? cliOf(worker.preference) : settingsCli);
                                                setSettings(true);
                                            }, disabled: retired, children: t('默认设置') })] })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-wordmark", children: [_jsx(BrandIcon, { size: 36, tone: "monochrome" }), _jsxs("h2", { "aria-label": "CLI Worker Now", children: [_jsx("span", { children: "CLI Worker" }), _jsx("small", { children: "NOW" })] })] }), _jsx(Tooltip, { label: t('默认设置'), side: "bottom", portal: true, children: _jsx(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-button", "aria-label": t('默认设置'), onClick: () => {
                                    setSettingsCli(undefined);
                                    setSettings(true);
                                }, children: _jsx(Glyph, { name: "settings" }) }) })] })) }), selected && worker && !retired && !running && (resumeBlocked || startingNew) && (_jsxs("div", { className: "cwn-resume-banner", role: "status", "aria-label": t('对话状态'), children: [_jsx("span", { children: startingNew
                            ? t('新对话将沿用原设定')
                            : resumeBlocked === '此历史任务缺少账号记录，请新建任务'
                                ? t('历史账号记录缺失')
                                : hostText(resumeBlocked) }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": startingNew ? t('取消新建') : t('新建对话'), disabled: busy || (!startingNew && unavailable), onClick: () => setRestartFor(startingNew ? '' : worker.id), children: startingNew ? t('取消') : t('新建对话') })] })), renaming && (_jsx(RenameWorker, { api: api, sessionId: sessionId, worker: renaming.worker, mode: renaming.mode, onClose: () => setRenaming(undefined) }, `${renaming.worker.id}:${renaming.mode}`)), _jsx(SettingsDialog, { openNativeSettings: openNativeSettings
                    ? () => {
                        nativeSettingsRequested.current = true;
                        setSettings(false);
                    }
                    : undefined, open: settings, onClose: () => setSettings(false), api: api, sessionId: sessionId, initialCli: settingsCli }), !selected && !dshChild && (_jsxs("div", { className: "cwn-overview", children: [_jsxs("div", { className: "cwn-overview-controls", children: [_jsx(Input, { className: "cwn-search", icon: _jsx(Glyph, { name: "search" }), type: "search", "aria-label": t('筛选子 Agent'), placeholder: t('搜索智能体、话题或模型…'), value: query, onChange: (e) => setQuery(e.target.value) }), _jsxs("div", { className: "cwn-filter-row", children: [_jsx("div", { className: "cwn-filters", role: "group", "aria-label": t('任务状态筛选'), children: [
                                            ['all', t('全部')],
                                            ['active', t('进行中')],
                                            ['completed', t('已完成')],
                                            ['attention', t('异常')],
                                        ].map(([id, label]) => (_jsx(Button, { type: "button", variant: "outline", size: "md", "aria-pressed": !showArchived && filter === id, onClick: () => {
                                                setShowArchived(false);
                                                setFilter(id);
                                            }, children: label }, id))) }), _jsx(Tooltip, { label: showArchived ? t('返回列表') : t('已删除'), side: "bottom", portal: true, children: _jsx(Button, { type: "button", size: "md", variant: "ghost", className: "cwn-archive-toggle", "aria-label": showArchived ? t('返回列表') : t('已删除'), "aria-pressed": showArchived, onClick: () => setShowArchived((shown) => !shown), children: _jsx(IconTrashOutlineRegular, {}) }) })] })] }), _jsxs("div", { className: "cwn-overview-list", ref: overview, onScroll: () => {
                            overviewScroll.current = overview.current?.scrollTop ?? 0;
                        }, children: [showArchived ? (_jsxs("div", { className: "cwn-archived-list", "aria-label": t('已删除对话'), children: [archivedWorkers.length === 0 && _jsx("div", { className: "cwn-empty", children: t('没有已删除的对话') }), archivedWorkers.map((archived) => (_jsxs("article", { className: "cwn-archived-row", children: [_jsxs("div", { children: [_jsx("strong", { children: archived.title }), _jsx("small", { children: workerName(archived) })] }), _jsx(Button, { type: "button", size: "sm", variant: "outline", "aria-label": t('恢复对话 {title}', { title: archived.title }), disabled: busy || unavailable, onClick: () => {
                                                    void perform(async () => {
                                                        const controller = new AbortController();
                                                        managementAbort.current = controller;
                                                        try {
                                                            value(await api.cliworker.restoreWorker(sessionId, archived.id, controller.signal));
                                                        }
                                                        finally {
                                                            if (managementAbort.current === controller)
                                                                managementAbort.current = undefined;
                                                        }
                                                    });
                                                }, children: t('恢复') })] }, archived.id)))] })) : (_jsxs("nav", { "aria-label": t('子 Agent'), children: [visibleDsh.length > 0 && _jsxs("section", { className: "cwn-cli-group", "aria-label": t('{cli} 子 Agent', { cli: 'DSH' }), children: [_jsxs("button", { className: "cwn-cli-heading", type: "button", "aria-expanded": !collapsed.dsh, "aria-controls": `${cliGroupId}-dsh`, onClick: () => setCollapsed((old) => ({ ...old, dsh: !old.dsh })), children: [_jsx(DshIcon, {}), _jsx("strong", { children: "DSH" }), _jsx("span", { children: t('{count} 个 Agent', { count: visibleDsh.length }) }), _jsx(Glyph, { name: "chevron" })] }), _jsx("div", { id: `${cliGroupId}-dsh`, className: "cwn-cli-rows", "data-expanded": !collapsed.dsh, "aria-hidden": !!collapsed.dsh, ...(collapsed.dsh ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-cli-rows-inner", children: visibleDsh.map((child) => _jsx(DshSubagentCard, { child: child, collapsed: !!collapsed.dsh, busy: busy, onOpen: () => { lastWorker.current = child.id; setSettings(false); select(''); selectDsh(child); }, onHide: () => void perform(async () => {
                                                            const controller = new AbortController();
                                                            managementAbort.current = controller;
                                                            try {
                                                                if (!api.cliworker.hideDshSubagent)
                                                                    throw new Error(t('DSH 子 Agent 列表暂时不可用'));
                                                                value(await api.cliworker.hideDshSubagent(sessionId, child.id, controller.signal));
                                                                dsh.refresh();
                                                            }
                                                            finally {
                                                                if (managementAbort.current === controller)
                                                                    managementAbort.current = undefined;
                                                            }
                                                        }) }, child.id)) }) })] }), [...CLI_IDS, 'harness'].map((cli) => {
                                        const rows = visibleWorkers.filter((w) => cliOf(w.preference) === cli);
                                        if (!rows.length)
                                            return null;
                                        return (_jsxs("section", { className: "cwn-cli-group", "aria-label": t('{cli} 子 Agent', { cli: CLI_LABELS[cli] }), children: [_jsxs("button", { className: "cwn-cli-heading", type: "button", "aria-expanded": !collapsed[cli], "aria-controls": `${cliGroupId}-${cli}`, onClick: () => setCollapsed((old) => ({ ...old, [cli]: !old[cli] })), children: [_jsx(BrandIcon, { cli: cli }), _jsx("strong", { children: CLI_LABELS[cli] }), _jsx("span", { children: t('{count} 个 Agent', { count: rows.length }) }), _jsx(Glyph, { name: "chevron" })] }), _jsx("div", { id: `${cliGroupId}-${cli}`, className: "cwn-cli-rows", "data-expanded": !collapsed[cli], "aria-hidden": !!collapsed[cli], ...(collapsed[cli] ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-cli-rows-inner", children: rows.map((w) => (_jsx(WorkerCard, { worker: w, collapsed: !!collapsed[cli], unavailable: unavailable, busy: busy, onOpen: () => openWorker(w.id), onManage: (action) => manageWorker(w, action) }, w.id))) }) })] }, cli));
                                    })] })), snapshot.configuring && (_jsx("div", { className: "cwn-notice", children: t('等待确认设定。请在主对话的问题卡片中选择。') })), !connecting &&
                                !streamError &&
                                !snapshot.workers.length &&
                                !dsh.rows.length &&
                                !snapshot.configuring &&
                                !showArchived &&
                                !query &&
                                filter === 'all' && (_jsxs("div", { className: "cwn-empty cwn-start-empty", children: [_jsx("h3", { children: t('把想做的事，交给合适的伙伴。') }), _jsx("p", { children: t('在主对话中发起任务，协作会在这里展开。') })] }))] })] })), dshChild && (renderDshConversation?.(dshChild) ?? _jsx("p", { className: "cwn-notice", children: t('无法打开原生会话') })), dsh.error && _jsx("p", { role: "status", className: "cwn-notice", children: dsh.error }), streamError && (_jsxs("div", { role: "alert", className: "cwn-error", children: [_jsx("div", { children: t('实时连接已断开，已收到的记录保留在这里。重新连接不会重新执行任务。') }), _jsx(Button, { type: "button", size: "sm", variant: "outline", onClick: reconnect, children: t('重新连接') }), _jsxs("details", { children: [_jsx("summary", { children: t('连接详情') }), streamError] })] })), connecting && (_jsxs("div", { className: "cwn-notice", role: "status", children: [_jsx(StateDot, { state: "ongoing", size: 14 }), " ", t('正在连接并恢复记录…')] })), error && !settings && (_jsx("div", { role: "alert", className: "cwn-notice", children: error })), worker?.error && !isUserInterrupted(worker) && (_jsx("div", { role: "status", className: worker.status === 'uncertain' ? 'cwn-notice cwn-warning' : 'cwn-error', children: hostText(worker.error) })), selected && history && !renderHarnessConversation && (_jsxs("div", { className: "cwn-history-nav", "aria-label": t('历史翻页'), children: [_jsx("span", { children: t('历史记录 {start}–{end} · 读取时共 {total} 条', { start: history.start + 1, end: history.end, total: history.total }) }), _jsxs("div", { children: [_jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || unavailable || !history.hasOlder, onClick: () => loadHistory('before'), children: t('更早记录') }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || unavailable || !history.hasNewer, onClick: () => loadHistory('after'), children: t('较新记录') }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: jumpToLatest, children: t('返回实时') })] }), _jsx("small", { children: t('历史页保持静止，返回实时可查看最新进展。') })] })), selected &&
                worker &&
                renderHarnessConversation &&
                renderHarnessConversation(worker), selected && !renderHarnessConversation && (_jsxs("div", { className: "cwn-conversation", children: [_jsxs("div", { className: "cwn-feed", ref: feed, onScroll: () => {
                            if (history)
                                return;
                            const el = feed.current;
                            // Harness rc.2 ScrollFollow uses a 25px bottom tolerance.
                            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 25;
                            setFollowing(stick.current);
                        }, "aria-label": t('对话记录'), "aria-busy": running || false, children: [snapshot.configuring && (_jsx("div", { className: "cwn-notice", children: t('等待确认设定。请在主对话的问题卡片中选择。') })), !history && snapshot.truncated && (_jsxs("div", { className: "cwn-history-start", children: [_jsx("span", { children: t('当前显示最近 {count} 条记录', { count: snapshot.timeline.length }) }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || unavailable, onClick: () => loadHistory('before'), children: t('查看更早记录') })] })), _jsx(ConversationTimeline, { items: displayedTimeline, latestItems: latestTimeline, worker: worker, messageFeedback: Object.fromEntries(submissions.localMessages
                                    .filter((message) => message.route !== 'interrupt' && message.state === 'failed')
                                    .map((message) => [
                                    `local-${message.id}:user`,
                                    _jsxs("span", { role: "status", children: [message.uncertain ? message.error : t('未发送：{error}', { error: message.error ?? '' }), (message.uncertain || message.runEnded) && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": t('恢复内容 {prompt}', { prompt: message.prompt }), onClick: () => submissions.recover(message), children: t('恢复内容') })), message.state === 'failed' && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": t('重试发送 {prompt}', { prompt: message.prompt }), disabled: !canResume ||
                                                    busy ||
                                                    message.uncertain ||
                                                    message.runEnded ||
                                                    (message.mode === 'steer' && !submissions.canSteer(message.worker.id)), title: message.runEnded ? t('原轮已结束，请核查记录或恢复内容后自行处理') : undefined, onClick: () => {
                                                    submissions.submit(message.worker, message.prompt, message.route, message.mode, message);
                                                    clearSubmitted(message.worker.id, message.prompt);
                                                    submittedDraft.current.delete(message.worker.id);
                                                }, children: t('重试') }))] }, message.id),
                                ])) })] }), !history && !following && worker && (_jsx("div", { className: "cwn-jump", children: _jsx("button", { className: "cwn-jump-button", type: "button", "aria-label": t('回到最新消息'), onClick: jumpToLatest, children: _jsx(IconChevronDownOutlineRegular, {}) }) }))] })), selected && worker && !renderHarnessConversation && (_jsx(_Fragment, { children: _jsxs("form", { ref: composerForm, className: "cwn-compose", "aria-label": renderHarnessConversation ? t('CLI Worker 消息输入') : undefined, onSubmit: (e) => {
                        e.preventDefault();
                        submitPrompt(prompt);
                    }, children: [renderHarnessConversation && (_jsx("p", { className: "cwn-resume-hint", role: "status", children: t('原生对话用于显示；请在此发送、排队或引导，停止仍等待 CLI 进程清理完成。') })), retired && _jsx("p", { className: "cwn-resume-hint", children: RETIRED_HARNESS_NOTICE }), snapshot.runningMessageModeReason && (_jsx("p", { className: "cwn-resume-hint", role: "status", children: hostText(snapshot.runningMessageModeReason) })), userInterrupted && !worker.conversationId && !resumeBlocked && (_jsx("p", { className: "cwn-resume-hint", role: "status", children: t('上次停止前尚未建立 CLI 会话，再次发送将开始新会话；已有记录会保留。') })), _jsx(FollowupQueuePresence, { scopeKey: worker.id, items: queuedFollowups, expanded: followupsExpanded, bodyId: followupQueueId, heading: (count) => (_jsxs(_Fragment, { children: [_jsx("span", { children: t('待发送 · {count}', { count }) }), _jsxs("div", { className: "cwn-followup-heading-actions", children: [snapshot.queuedFollowups?.some((item) => item.state === 'paused') && !running && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", disabled: busy ||
                                                    submissions.interrupting ||
                                                    submissions.uncertain ||
                                                    unavailable ||
                                                    !!resumeBlocked ||
                                                    (!worker.conversationId && !userInterrupted), onClick: () => void perform(async () => {
                                                    value(await api.cliworker.retryQueuedFollowups(sessionId, worker.id, worker.runId));
                                                }), children: t('继续发送') })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", className: "cwn-followup-toggle", "aria-label": followupsExpanded ? t('折叠待发送消息') : t('展开待发送消息'), "aria-expanded": followupsExpanded, "aria-controls": followupQueueId, onClick: () => setCollapsedFollowups((old) => ({ ...old, [worker.id]: !old[worker.id] })), children: _jsx(IconChevronDownOutlineRegular, { size: 14 }) })] })] })), renderItem: (item, index) => {
                                const local = submissions.localQueue.find((message) => message.id === item.id);
                                return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-followup-content", children: [_jsx("p", { children: item.prompt }), item.state === 'paused' &&
                                                    item.pauseReason &&
                                                    !['已停止发送', '任务已停止，请确认后继续发送'].includes(item.pauseReason) && (_jsx("small", { children: hostText(item.pauseReason) }))] }), _jsxs("div", { className: "cwn-followup-actions", children: [local?.state === 'failed' && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": local.uncertain ? t('恢复内容 {prompt}', { prompt: local.prompt }) : t('重试发送 {prompt}', { prompt: local.prompt }), disabled: !local.uncertain && (!canResume || busy), onClick: () => {
                                                        if (local.uncertain)
                                                            submissions.recover(local);
                                                        else {
                                                            submissions.submit(local.worker, local.prompt, local.route, local.mode, local);
                                                            clearSubmitted(local.worker.id, local.prompt);
                                                            submittedDraft.current.delete(local.worker.id);
                                                        }
                                                    }, children: local.uncertain ? t('恢复内容') : t('重试') })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": t('插队待发送消息 {index}', { index: index + 1 }), title: t('停止当前轮后优先发送这条消息'), disabled: unavailable || !!resumeBlocked || (!worker.conversationId && !userInterrupted), onClick: () => {
                                                        if (unavailable || resumeBlocked || (!worker.conversationId && !userInterrupted))
                                                            return;
                                                        submissions.interruptQueued(worker, item);
                                                        jumpToLatest();
                                                    }, children: t('插队') }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": t('取消待发送消息 {index}', { index: index + 1 }), disabled: busy ||
                                                        unavailable ||
                                                        (!!local && local.state !== 'failed' && local.state !== 'cancelled') ||
                                                        (item.state === 'sending' && !!running), onClick: () => {
                                                        if (local)
                                                            submissions.discard(local);
                                                        else
                                                            void perform(async () => {
                                                                value(await api.cliworker.cancelQueuedFollowup(sessionId, worker.id, item.id));
                                                            });
                                                    }, children: t('取消') })] })] }));
                            } }), _jsxs("div", { className: "cwn-compose-box", children: [_jsx("textarea", { ref: composerInput, "aria-label": startingNew ? t('新建对话内容') : t('继续对话'), value: prompt, onChange: (e) => {
                                        submittedDraft.current.delete(worker.id);
                                        editDraft(worker.id, e.target.value);
                                    }, onKeyDown: composerKeys.onKeyDown, onCompositionStart: composerKeys.onCompositionStart, onCompositionEnd: composerKeys.onCompositionEnd, disabled: !canResume, maxLength: 100000, placeholder: startingNew
                                        ? t('输入新对话的任务…')
                                        : running
                                            ? runningMessageMode === 'steer'
                                                ? t('输入引导消息，交给 CLI 在当前运行中处理…')
                                                : runningMessageMode === 'interrupt'
                                                    ? t('输入消息，停止当前轮后优先发送…')
                                                    : t('输入下一步，本轮结束后自动发送…')
                                            : t('给这个子 Agent 分配下一步…'), rows: 1 }), _jsxs("div", { className: "cwn-compose-bottom", children: [!renderHarnessConversation && workerModelMenu, (running ||
                                            submissions.pending ||
                                            stoppingRequest ||
                                            submissions.uncertain ||
                                            submissions.stopUnconfirmed) &&
                                            !prompt.trim() ? (_jsx(Button, { type: "button", size: "sm", variant: "outline", className: "cwn-send", "aria-label": t('停止'), title: t('停止'), disabled: stoppingRequest ||
                                                unavailable ||
                                                (worker.status === 'stopping' &&
                                                    !submissions.interrupting &&
                                                    !submissions.stopUnconfirmed), onClick: () => void stopWorker(worker), children: _jsx(Glyph, { name: "stop" }) })) : (_jsx("button", { type: "submit", className: "cwn-send", "aria-label": startingNew ? t('新建对话并发送') : submissionLabel, title: startingNew ? t('新建对话并发送') : submissionHint, disabled: !submitEnabled.current, onMouseDown: (e) => {
                                                e.preventDefault();
                                                composerInput.current?.focus({ preventScroll: true });
                                            }, children: _jsx(Glyph, { name: "send" }) }))] })] }), _jsx(ComposerTelemetry, { worker: worker, telemetry: snapshot.telemetry, statusLabel: userInterrupted ? t('已停止') : t(status[worker.status]) })] }) }))] }));
}
//# sourceMappingURL=panel.js.map