import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ComposerTelemetry } from "./telemetry.js";
import { HarnessLegacyHistory } from "./harness-legacy-history.js";
import { ConversationTimeline } from "./conversation-timeline.js";
import { displayModelName } from "../shared/model-presentation.js";
import { operationMessage } from "./operation-error.js";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Tooltip, StateDot, IconChevronDownOutlineRegular, IconTrashOutlineRegular, } from '@deepseek-ai/dsh-client-ui-primitives';
import { createComposerKeymap } from "./composer-keymap.js";
import { active, CLI_IDS, CLI_LABELS, isRetiredCli, isUserInterrupted, RETIRED_HARNESS_NOTICE, cliOf, workerName, } from "../shared/types.js";
import { useWorkers, value } from "./workers.js";
import { CopyText } from "./copy-text.js";
import { BrandIcon, Glyph } from "./icons.js";
import { WorkerModelMenu } from "./worker-model-menu.js";
import { SettingsDialog } from "./settings-dialog.js";
import { RenameWorker } from "./rename-worker.js";
import { WorkerCard } from "./worker-card.js";
import { RUNNING_MESSAGE_LABELS } from "../shared/running-message.js";
import { useMessageSubmissions } from "./message-submissions.js";
import { FollowupQueuePresence } from "./followup-queue-presence.js";
import { HarnessCapabilityNotes } from "./harness-conversation.js";
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
    // In-memory only: project content is never copied into browser localStorage.
    const [drafts, setDrafts] = useState({});
    return (_jsx(SessionPanel, { ...props, drafts: drafts, editDraft: (id, text) => setDrafts((old) => ({ ...old, [id]: text })), clearSubmitted: (id, submitted) => setDrafts((old) => (old[id] === submitted ? { ...old, [id]: '' } : old)), restoreDraft: (id, text) => setDrafts((old) => (old[id] ? old : { ...old, [id]: text })) }, props.sessionId));
}
function SessionPanel({ sessionId, api, openNativeSettings, renderHarnessConversation, activeHarnessSessionId, drafts, editDraft, clearSubmitted, restoreDraft, }) {
    const [selected, select] = useState('');
    const [collapsed, setCollapsed] = useState({});
    const [collapsedFollowups, setCollapsedFollowups] = useState({});
    const cliGroupId = useId();
    const followupQueueId = useId();
    const overview = useRef(null), overviewScroll = useRef(0);
    const back = useRef(null), lastWorker = useRef('');
    useLayoutEffect(() => {
        if (selected)
            back.current?.focus();
        else if (overview.current) {
            overview.current.scrollTop = overviewScroll.current;
            overview.current
                .querySelector(`[data-open-worker-id='${lastWorker.current}']`)
                ?.focus({ preventScroll: true });
        }
    }, [selected]);
    const openWorker = (id) => {
        lastWorker.current = id;
        setSettings(false);
        select(id);
    };
    const [query, setQuery] = useState(''), [filter, setFilter] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [historyPage, setHistoryPage] = useState();
    const history = historyPage?.workerId === selected ? historyPage : undefined;
    const { snapshot, error: streamError, connecting, reconnect } = useWorkers(api, sessionId, selected);
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
    const [settingsCli, setSettingsCli] = useState('antigravity');
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
                setError('无法打开原生设置。请从 Harness 左侧打开「设置 → 模型」管理 API 登录。');
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
            ? '请先发送或取消待发送消息，再修改模型与强度'
            : submissions.pending || submissions.uncertain
                ? '请等待当前消息提交确认，再修改模型与强度'
                : undefined }, `model:${worker.id}`));
    const runningMessageMode = snapshot.runningMessageMode ?? 'queue';
    const submissionLabel = waitingForTurn
        ? runningMessageMode === 'queue'
            ? '加入待发送消息'
            : `${RUNNING_MESSAGE_LABELS[runningMessageMode]}发送`
        : queueSubmission
            ? '加入待发送消息'
            : '继续对话';
    const submissionHint = waitingForTurn
        ? runningMessageMode === 'steer'
            ? '引导当前运行'
            : runningMessageMode === 'interrupt'
                ? '停止当前轮后插队发送'
                : '本轮结束后发送'
        : queueSubmission
            ? '加入待发送消息'
            : '继续对话';
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
                setError('当前运行尚未准备好接收引导，请保留消息后重试或选择其他发送方式。');
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
                throw new Error('新对话未返回有效的智能体记录');
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
                throw new Error('收到不匹配的历史记录');
            if (!page.items.length) {
                jumpToLatest();
                return;
            }
            stick.current = false;
            setFollowing(false);
            setHistoryPage(page);
        });
    };
    return (_jsxs("section", { className: "cwn", "aria-label": "CLI Worker Now", children: [_jsx("header", { className: "cwn-head", children: selected ? (_jsxs(_Fragment, { children: [_jsx(Tooltip, { label: "\u8FD4\u56DE\u5B50 Agent \u5217\u8868", side: "bottom", portal: true, children: _jsx(Button, { ref: back, type: "button", variant: "outline", size: "sm", className: "cwn-back", "aria-label": "\u8FD4\u56DE\u5B50 Agent \u5217\u8868", onClick: () => {
                                    setSettings(false);
                                    select('');
                                }, children: _jsx(Glyph, { name: "back" }) }) }), _jsx("h2", { title: worker ? `${workerName(worker)}｜${worker.title}` : undefined, children: (() => {
                                const current = worker ?? snapshot.workers.find((w) => w.id === selected);
                                return current ? `${workerName(current)}｜${current.title}` : '正在加载…';
                            })() }), _jsxs("details", { className: "cwn-actions", children: [_jsx("summary", { "aria-label": "\u4EFB\u52A1\u9009\u9879", title: "\u4EFB\u52A1\u9009\u9879", children: _jsx(Glyph, { name: "more" }) }), _jsxs("div", { className: `cwn-action-menu${renderHarnessConversation ? ' cwn-native-action-menu' : ''}`, children: [worker && (_jsxs(_Fragment, { children: [_jsx("strong", { children: CLI_LABELS[cliOf(worker.preference)] }), _jsx("p", { children: worker.mode === 'plan' ? 'CLI 规划模式' : '可编辑任务' }), worker.role && _jsxs("p", { title: worker.role.summary, children: ["\u89D2\u8272\uFF1A", worker.role.name] }), worker.harnessConversation && (_jsx(HarnessCapabilityNotes, { binding: worker.harnessConversation })), renderHarnessConversation && (_jsxs(_Fragment, { children: [workerModelMenu, _jsx(HarnessLegacyHistory, { api: api, parentSessionId: sessionId, worker: worker, items: snapshot.timeline, truncated: snapshot.truncated, queuedFollowups: snapshot.queuedFollowups }, `history:${worker.id}`)] })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => manageWorker(worker, 'name'), disabled: unavailable || busy, children: "\u4FEE\u6539\u667A\u80FD\u4F53\u540D\u79F0" }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => manageWorker(worker, 'title'), disabled: unavailable || busy, children: "\u4FEE\u6539\u804A\u5929\u6807\u9898" }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => manageWorker(worker, 'delete'), disabled: unavailable || busy || !!running, children: "\u5220\u9664" }), worker.observedModel && worker.observedModel !== worker.preference.model && (_jsxs("p", { children: ["CLI \u5B9E\u9645\u6A21\u578B\uFF1A", displayModelName({ ...worker.preference, model: worker.observedModel })] })), worker.lastResult && (_jsx(CopyText, { text: worker.lastResult, label: "\u590D\u5236\u6700\u65B0\u7ED3\u679C" }, `${worker.id}:${worker.runId}`))] })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => {
                                                setSettingsCli(worker && !retired ? cliOf(worker.preference) : settingsCli);
                                                setSettings(true);
                                            }, disabled: retired, children: "\u9ED8\u8BA4\u8BBE\u7F6E" })] })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-wordmark", children: [_jsx(BrandIcon, { size: 36, tone: "monochrome" }), _jsxs("h2", { "aria-label": "CLI Worker Now", children: [_jsx("span", { children: "CLI Worker" }), _jsx("small", { children: "NOW" })] })] }), _jsx(Tooltip, { label: "\u9ED8\u8BA4\u8BBE\u7F6E", side: "bottom", portal: true, children: _jsx(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-button", "aria-label": "\u9ED8\u8BA4\u8BBE\u7F6E", onClick: () => setSettings(true), children: _jsx(Glyph, { name: "settings" }) }) })] })) }), selected && worker && !retired && !running && (resumeBlocked || startingNew) && (_jsxs("div", { className: "cwn-resume-banner", role: "status", "aria-label": "\u5BF9\u8BDD\u72B6\u6001", children: [_jsx("span", { children: startingNew
                            ? '新对话将沿用原设定'
                            : resumeBlocked === '此历史任务缺少账号记录，请新建任务'
                                ? '历史账号记录缺失'
                                : resumeBlocked }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": startingNew ? '取消新建' : '新建对话', disabled: busy || (!startingNew && unavailable), onClick: () => setRestartFor(startingNew ? '' : worker.id), children: startingNew ? '取消' : '新建对话' })] })), renaming && (_jsx(RenameWorker, { api: api, sessionId: sessionId, worker: renaming.worker, mode: renaming.mode, onClose: () => setRenaming(undefined) }, `${renaming.worker.id}:${renaming.mode}`)), _jsx(SettingsDialog, { openNativeSettings: openNativeSettings
                    ? () => {
                        nativeSettingsRequested.current = true;
                        setSettings(false);
                    }
                    : undefined, open: settings, onClose: () => setSettings(false), api: api, sessionId: sessionId, initialCli: settingsCli }), !selected && (_jsxs("div", { className: "cwn-overview", children: [_jsxs("div", { className: "cwn-overview-controls", children: [_jsx(Input, { className: "cwn-search", icon: _jsx(Glyph, { name: "search" }), type: "search", "aria-label": "\u7B5B\u9009\u5B50 Agent", placeholder: "\u641C\u7D22\u667A\u80FD\u4F53\u3001\u8BDD\u9898\u6216\u6A21\u578B\u2026", value: query, onChange: (e) => setQuery(e.target.value) }), _jsxs("div", { className: "cwn-filter-row", children: [_jsx("div", { className: "cwn-filters", role: "group", "aria-label": "\u4EFB\u52A1\u72B6\u6001\u7B5B\u9009", children: [
                                            ['all', '全部'],
                                            ['active', '进行中'],
                                            ['completed', '已完成'],
                                            ['attention', '异常'],
                                        ].map(([id, label]) => (_jsx(Button, { type: "button", variant: "outline", size: "md", "aria-pressed": !showArchived && filter === id, onClick: () => {
                                                setShowArchived(false);
                                                setFilter(id);
                                            }, children: label }, id))) }), _jsx(Tooltip, { label: showArchived ? '返回列表' : '已删除', side: "bottom", portal: true, children: _jsx(Button, { type: "button", size: "md", variant: "ghost", className: "cwn-archive-toggle", "aria-label": showArchived ? '返回列表' : '已删除', "aria-pressed": showArchived, onClick: () => setShowArchived((shown) => !shown), children: _jsx(IconTrashOutlineRegular, {}) }) })] })] }), _jsxs("div", { className: "cwn-overview-list", ref: overview, onScroll: () => {
                            overviewScroll.current = overview.current?.scrollTop ?? 0;
                        }, children: [showArchived ? (_jsxs("div", { className: "cwn-archived-list", "aria-label": "\u5DF2\u5220\u9664\u5BF9\u8BDD", children: [archivedWorkers.length === 0 && _jsx("div", { className: "cwn-empty", children: "\u6CA1\u6709\u5DF2\u5220\u9664\u7684\u5BF9\u8BDD" }), archivedWorkers.map((archived) => (_jsxs("article", { className: "cwn-archived-row", children: [_jsxs("div", { children: [_jsx("strong", { children: archived.title }), _jsx("small", { children: workerName(archived) })] }), _jsx(Button, { type: "button", size: "sm", variant: "outline", "aria-label": `恢复对话 ${archived.title}`, disabled: busy || unavailable, onClick: () => {
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
                                                }, children: "\u6062\u590D" })] }, archived.id)))] })) : (_jsx("nav", { "aria-label": "\u5B50 Agent", children: [...CLI_IDS, 'harness'].map((cli) => {
                                    const rows = visibleWorkers.filter((w) => cliOf(w.preference) === cli);
                                    if (!rows.length)
                                        return null;
                                    return (_jsxs("section", { className: "cwn-cli-group", "aria-label": `${CLI_LABELS[cli]} 子 Agent`, children: [_jsxs("button", { className: "cwn-cli-heading", type: "button", "aria-expanded": !collapsed[cli], "aria-controls": `${cliGroupId}-${cli}`, onClick: () => setCollapsed((old) => ({ ...old, [cli]: !old[cli] })), children: [_jsx(BrandIcon, { cli: cli }), _jsx("strong", { children: CLI_LABELS[cli] }), _jsxs("span", { children: [rows.length, " \u4E2A Agent"] }), _jsx(Glyph, { name: "chevron" })] }), _jsx("div", { id: `${cliGroupId}-${cli}`, className: "cwn-cli-rows", "data-expanded": !collapsed[cli], "aria-hidden": !!collapsed[cli], ...(collapsed[cli] ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-cli-rows-inner", children: rows.map((w) => (_jsx(WorkerCard, { worker: w, collapsed: !!collapsed[cli], unavailable: unavailable, busy: busy, onOpen: () => openWorker(w.id), onManage: (action) => manageWorker(w, action) }, w.id))) }) })] }, cli));
                                }) })), snapshot.configuring && (_jsx("div", { className: "cwn-notice", children: "\u7B49\u5F85\u786E\u8BA4\u8BBE\u5B9A\u3002\u8BF7\u5728\u4E3B\u5BF9\u8BDD\u7684\u95EE\u9898\u5361\u7247\u4E2D\u9009\u62E9\u3002" })), !connecting &&
                                !streamError &&
                                !snapshot.workers.length &&
                                !snapshot.configuring &&
                                !showArchived &&
                                !query &&
                                filter === 'all' && (_jsxs("div", { className: "cwn-empty cwn-start-empty", children: [_jsx("h3", { children: "\u628A\u60F3\u505A\u7684\u4E8B\uFF0C\u4EA4\u7ED9\u5408\u9002\u7684\u4F19\u4F34\u3002" }), _jsx("p", { children: "\u5728\u4E3B\u5BF9\u8BDD\u4E2D\u53D1\u8D77\u4EFB\u52A1\uFF0C\u534F\u4F5C\u4F1A\u5728\u8FD9\u91CC\u5C55\u5F00\u3002" })] }))] })] })), streamError && (_jsxs("div", { role: "alert", className: "cwn-error", children: [_jsx("div", { children: "\u5B9E\u65F6\u8FDE\u63A5\u5DF2\u65AD\u5F00\uFF0C\u5DF2\u6536\u5230\u7684\u8BB0\u5F55\u4FDD\u7559\u5728\u8FD9\u91CC\u3002\u91CD\u65B0\u8FDE\u63A5\u4E0D\u4F1A\u91CD\u65B0\u6267\u884C\u4EFB\u52A1\u3002" }), _jsx(Button, { type: "button", size: "sm", variant: "outline", onClick: reconnect, children: "\u91CD\u65B0\u8FDE\u63A5" }), _jsxs("details", { children: [_jsx("summary", { children: "\u8FDE\u63A5\u8BE6\u60C5" }), streamError] })] })), connecting && (_jsxs("div", { className: "cwn-notice", role: "status", children: [_jsx(StateDot, { state: "ongoing", size: 14 }), " \u6B63\u5728\u8FDE\u63A5\u5E76\u6062\u590D\u8BB0\u5F55\u2026"] })), error && !settings && (_jsx("div", { role: "alert", className: "cwn-notice", children: error })), worker?.error && !isUserInterrupted(worker) && (_jsx("div", { role: "status", className: worker.status === 'uncertain' ? 'cwn-notice cwn-warning' : 'cwn-error', children: worker.error })), selected && history && !renderHarnessConversation && (_jsxs("div", { className: "cwn-history-nav", "aria-label": "\u5386\u53F2\u7FFB\u9875", children: [_jsxs("span", { children: ["\u5386\u53F2\u8BB0\u5F55 ", history.start + 1, "\u2013", history.end, " \u00B7 \u8BFB\u53D6\u65F6\u5171 ", history.total, " \u6761"] }), _jsxs("div", { children: [_jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || unavailable || !history.hasOlder, onClick: () => loadHistory('before'), children: "\u66F4\u65E9\u8BB0\u5F55" }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || unavailable || !history.hasNewer, onClick: () => loadHistory('after'), children: "\u8F83\u65B0\u8BB0\u5F55" }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: jumpToLatest, children: "\u8FD4\u56DE\u5B9E\u65F6" })] }), _jsx("small", { children: "\u5386\u53F2\u9875\u4FDD\u6301\u9759\u6B62\uFF0C\u8FD4\u56DE\u5B9E\u65F6\u53EF\u67E5\u770B\u6700\u65B0\u8FDB\u5C55\u3002" })] })), selected &&
                worker &&
                renderHarnessConversation &&
                renderHarnessConversation(worker), selected && !renderHarnessConversation && (_jsxs("div", { className: "cwn-conversation", children: [_jsxs("div", { className: "cwn-feed", ref: feed, onScroll: () => {
                            if (history)
                                return;
                            const el = feed.current;
                            // Harness rc.2 ScrollFollow uses a 25px bottom tolerance.
                            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 25;
                            setFollowing(stick.current);
                        }, "aria-label": "\u5BF9\u8BDD\u8BB0\u5F55", "aria-busy": running || false, children: [snapshot.configuring && (_jsx("div", { className: "cwn-notice", children: "\u7B49\u5F85\u786E\u8BA4\u8BBE\u5B9A\u3002\u8BF7\u5728\u4E3B\u5BF9\u8BDD\u7684\u95EE\u9898\u5361\u7247\u4E2D\u9009\u62E9\u3002" })), !history && snapshot.truncated && (_jsxs("div", { className: "cwn-history-start", children: [_jsxs("span", { children: ["\u5F53\u524D\u663E\u793A\u6700\u8FD1 ", snapshot.timeline.length, " \u6761\u8BB0\u5F55"] }), _jsx(Button, { type: "button", size: "sm", variant: "outline", disabled: busy || unavailable, onClick: () => loadHistory('before'), children: "\u67E5\u770B\u66F4\u65E9\u8BB0\u5F55" })] })), _jsx(ConversationTimeline, { items: displayedTimeline, latestItems: latestTimeline, worker: worker, messageFeedback: Object.fromEntries(submissions.localMessages
                                    .filter((message) => message.route !== 'interrupt' && message.state === 'failed')
                                    .map((message) => [
                                    `local-${message.id}:user`,
                                    _jsxs("span", { role: "status", children: [message.uncertain ? message.error : `未发送：${message.error}`, (message.uncertain || message.runEnded) && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": `恢复内容 ${message.prompt}`, onClick: () => submissions.recover(message), children: "\u6062\u590D\u5185\u5BB9" })), message.state === 'failed' && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": `重试发送 ${message.prompt}`, disabled: !canResume ||
                                                    busy ||
                                                    message.uncertain ||
                                                    message.runEnded ||
                                                    (message.mode === 'steer' && !submissions.canSteer(message.worker.id)), title: message.runEnded ? '原轮已结束，请核查记录或恢复内容后自行处理' : undefined, onClick: () => {
                                                    submissions.submit(message.worker, message.prompt, message.route, message.mode, message);
                                                    clearSubmitted(message.worker.id, message.prompt);
                                                    submittedDraft.current.delete(message.worker.id);
                                                }, children: "\u91CD\u8BD5" }))] }, message.id),
                                ])) })] }), !history && !following && worker && (_jsx("div", { className: "cwn-jump", children: _jsx("button", { className: "cwn-jump-button", type: "button", "aria-label": "\u56DE\u5230\u6700\u65B0\u6D88\u606F", onClick: jumpToLatest, children: _jsx(IconChevronDownOutlineRegular, {}) }) }))] })), selected && worker && !renderHarnessConversation && (_jsx(_Fragment, { children: _jsxs("form", { ref: composerForm, className: "cwn-compose", "aria-label": renderHarnessConversation ? 'CLI Worker 消息输入' : undefined, onSubmit: (e) => {
                        e.preventDefault();
                        submitPrompt(prompt);
                    }, children: [renderHarnessConversation && (_jsx("p", { className: "cwn-resume-hint", role: "status", children: "\u539F\u751F\u5BF9\u8BDD\u7528\u4E8E\u663E\u793A\uFF1B\u8BF7\u5728\u6B64\u53D1\u9001\u3001\u6392\u961F\u6216\u5F15\u5BFC\uFF0C\u505C\u6B62\u4ECD\u7B49\u5F85 CLI \u8FDB\u7A0B\u6E05\u7406\u5B8C\u6210\u3002" })), retired && _jsx("p", { className: "cwn-resume-hint", children: RETIRED_HARNESS_NOTICE }), snapshot.runningMessageModeReason && (_jsx("p", { className: "cwn-resume-hint", role: "status", children: snapshot.runningMessageModeReason })), userInterrupted && !worker.conversationId && !resumeBlocked && (_jsx("p", { className: "cwn-resume-hint", role: "status", children: "\u4E0A\u6B21\u505C\u6B62\u524D\u5C1A\u672A\u5EFA\u7ACB CLI \u4F1A\u8BDD\uFF0C\u518D\u6B21\u53D1\u9001\u5C06\u5F00\u59CB\u65B0\u4F1A\u8BDD\uFF1B\u5DF2\u6709\u8BB0\u5F55\u4F1A\u4FDD\u7559\u3002" })), _jsx(FollowupQueuePresence, { scopeKey: worker.id, items: queuedFollowups, expanded: followupsExpanded, bodyId: followupQueueId, heading: (count) => (_jsxs(_Fragment, { children: [_jsxs("span", { children: ["\u5F85\u53D1\u9001 \u00B7 ", count] }), _jsxs("div", { className: "cwn-followup-heading-actions", children: [snapshot.queuedFollowups?.some((item) => item.state === 'paused') && !running && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", disabled: busy ||
                                                    submissions.interrupting ||
                                                    submissions.uncertain ||
                                                    unavailable ||
                                                    !!resumeBlocked ||
                                                    (!worker.conversationId && !userInterrupted), onClick: () => void perform(async () => {
                                                    value(await api.cliworker.retryQueuedFollowups(sessionId, worker.id, worker.runId));
                                                }), children: "\u7EE7\u7EED\u53D1\u9001" })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", className: "cwn-followup-toggle", "aria-label": followupsExpanded ? '折叠待发送消息' : '展开待发送消息', "aria-expanded": followupsExpanded, "aria-controls": followupQueueId, onClick: () => setCollapsedFollowups((old) => ({ ...old, [worker.id]: !old[worker.id] })), children: _jsx(IconChevronDownOutlineRegular, { size: 14 }) })] })] })), renderItem: (item, index) => {
                                const local = submissions.localQueue.find((message) => message.id === item.id);
                                return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "cwn-followup-content", children: [_jsx("p", { children: item.prompt }), item.state === 'paused' &&
                                                    item.pauseReason &&
                                                    !['已停止发送', '任务已停止，请确认后继续发送'].includes(item.pauseReason) && (_jsx("small", { children: item.pauseReason }))] }), _jsxs("div", { className: "cwn-followup-actions", children: [local?.state === 'failed' && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": `${local.uncertain ? '恢复内容' : '重试发送'} ${local.prompt}`, disabled: !local.uncertain && (!canResume || busy), onClick: () => {
                                                        if (local.uncertain)
                                                            submissions.recover(local);
                                                        else {
                                                            submissions.submit(local.worker, local.prompt, local.route, local.mode, local);
                                                            clearSubmitted(local.worker.id, local.prompt);
                                                            submittedDraft.current.delete(local.worker.id);
                                                        }
                                                    }, children: local.uncertain ? '恢复内容' : '重试' })), _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": `插队待发送消息 ${index + 1}`, title: "\u505C\u6B62\u5F53\u524D\u8F6E\u540E\u4F18\u5148\u53D1\u9001\u8FD9\u6761\u6D88\u606F", disabled: unavailable || !!resumeBlocked || (!worker.conversationId && !userInterrupted), onClick: () => {
                                                        if (unavailable || resumeBlocked || (!worker.conversationId && !userInterrupted))
                                                            return;
                                                        submissions.interruptQueued(worker, item);
                                                        jumpToLatest();
                                                    }, children: "\u63D2\u961F" }), _jsx(Button, { type: "button", size: "sm", variant: "ghost", "aria-label": `取消待发送消息 ${index + 1}`, disabled: busy ||
                                                        unavailable ||
                                                        (!!local && local.state !== 'failed' && local.state !== 'cancelled') ||
                                                        (item.state === 'sending' && !!running), onClick: () => {
                                                        if (local)
                                                            submissions.discard(local);
                                                        else
                                                            void perform(async () => {
                                                                value(await api.cliworker.cancelQueuedFollowup(sessionId, worker.id, item.id));
                                                            });
                                                    }, children: "\u53D6\u6D88" })] })] }));
                            } }), _jsxs("div", { className: "cwn-compose-box", children: [_jsx("textarea", { ref: composerInput, "aria-label": startingNew ? '新建对话内容' : '继续对话', value: prompt, onChange: (e) => {
                                        submittedDraft.current.delete(worker.id);
                                        editDraft(worker.id, e.target.value);
                                    }, onKeyDown: composerKeys.onKeyDown, onCompositionStart: composerKeys.onCompositionStart, onCompositionEnd: composerKeys.onCompositionEnd, disabled: !canResume, maxLength: 100000, placeholder: startingNew
                                        ? '输入新对话的任务…'
                                        : running
                                            ? runningMessageMode === 'steer'
                                                ? '输入引导消息，交给 CLI 在当前运行中处理…'
                                                : runningMessageMode === 'interrupt'
                                                    ? '输入消息，停止当前轮后优先发送…'
                                                    : '输入下一步，本轮结束后自动发送…'
                                            : '给这个子 Agent 分配下一步…', rows: 1 }), _jsxs("div", { className: "cwn-compose-bottom", children: [!renderHarnessConversation && workerModelMenu, (running ||
                                            submissions.pending ||
                                            stoppingRequest ||
                                            submissions.uncertain ||
                                            submissions.stopUnconfirmed) &&
                                            !prompt.trim() ? (_jsx(Button, { type: "button", size: "sm", variant: "outline", className: "cwn-send", "aria-label": "\u505C\u6B62", title: "\u505C\u6B62", disabled: stoppingRequest ||
                                                unavailable ||
                                                (worker.status === 'stopping' &&
                                                    !submissions.interrupting &&
                                                    !submissions.stopUnconfirmed), onClick: () => void stopWorker(worker), children: _jsx(Glyph, { name: "stop" }) })) : (_jsx("button", { type: "submit", className: "cwn-send", "aria-label": startingNew ? '新建对话并发送' : submissionLabel, title: startingNew ? '新建对话并发送' : submissionHint, disabled: !submitEnabled.current, onMouseDown: (e) => {
                                                e.preventDefault();
                                                composerInput.current?.focus({ preventScroll: true });
                                            }, children: _jsx(Glyph, { name: "send" }) }))] })] }), _jsx(ComposerTelemetry, { worker: worker, telemetry: snapshot.telemetry, statusLabel: userInterrupted ? '已停止' : status[worker.status] })] }) }))] }));
}
//# sourceMappingURL=panel.js.map