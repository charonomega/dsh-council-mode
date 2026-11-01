import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button, Modal, StateDot, Switch, Tooltip, IconChevronDownOutlineRegular, IconLinkOutlineRegular, IconRefreshOutlineRegular, IconUserOutlineRegular, } from '@deepseek-ai/dsh-client-ui-primitives';
import { CLI_IDS, CLI_LABELS, isRetiredCli, effortLabel, } from "../shared/types.js";
import { modelName } from "../shared/models.js";
import { visibleModelChoices } from "../shared/model-presentation.js";
import { AccountTerminal } from "./account-terminal.js";
import { BrandIcon, Glyph } from "./icons.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { RolePresetsPane } from "./role-presets.js";
import { AccountQueryQueue } from "./account-query-queue.js";
import { CliExecutableSettings } from "./cli-executable-settings.js";
import { NativeChoice } from "./native-settings-choice.js";
import { preferenceReadVersion, SettingsPreferenceSaves } from "./settings-preference-saves.js";
import { settingsCacheMetadata, settingsDisplayPool, } from "./settings-display-cache.js";
function readEnabled(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed?.enabled || CLI_IDS.some((id) => typeof parsed.enabled[id] !== 'boolean')) {
        throw new Error('CLI 开关状态不完整，请重新打开设置');
    }
    return parsed.enabled;
}
function providerLoginSummary(account) {
    if (!Array.isArray(account.logins))
        return undefined;
    const unsafe = /\p{C}|[<>]|\b(?:Bearer|sk-|sk_|ghp_|ya29\.)/iu;
    const logins = account.logins.flatMap((login) => {
        if (!login || !['oauth', 'api'].includes(login.authMethod))
            return [];
        const provider = typeof login.providerLabel === 'string' ? login.providerLabel.trim() : '';
        if (!provider || provider.length > 64 || unsafe.test(provider))
            return [];
        const identity = login.authMethod === 'oauth' && typeof login.accountLabel === 'string' ? login.accountLabel.trim() : '';
        const email = identity.length <= 254 && !unsafe.test(identity) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(identity)
            ? identity
            : '';
        return [
            {
                label: login.authMethod === 'api' ? `${provider} API 登录` : `${provider}账号登录`,
                authMethod: login.authMethod,
                email,
            },
        ];
    });
    if (!logins.length)
        return undefined;
    const oauth = logins.filter((login) => login.authMethod === 'oauth');
    const visible = oauth.length ? oauth : logins;
    const detail = [...new Set(logins.map(({ label, email }) => (email ? `${label} ${email}` : label)))].join(' · ');
    return {
        label: [...new Set(visible.map(({ label }) => label))].join(' · '),
        detail,
    };
}
function authenticatedLabel(account) {
    return providerLoginSummary(account)?.label ?? (account.authMethod === 'api' ? 'API 登录' : '已登录');
}
function connectionStatus(enabled, account, settingsError = '') {
    if (enabled === false)
        return { state: 'disabled', label: '已关闭' };
    if (settingsError)
        return { state: 'failed', label: 'CLI 开关配置读取失败，请重新打开设置' };
    if (enabled === undefined || !account || (account.loading && !account.data))
        return { state: 'pending', label: '正在检查连接' };
    if (!account.error && account.data?.state === 'unconfigured')
        return {
            state: 'unconfigured',
            label: account.data.installed
                ? account.data.cli === 'claude'
                    ? account.data.summary
                    : '未登录'
                : '未安装',
        };
    if (account.error || !account.data || ['unavailable', 'unauthenticated'].includes(account.data.state)) {
        return { state: 'failed', label: account.error || account.data?.summary || '连接失败' };
    }
    if (!['authenticated', 'configured'].includes(account.data.state)) {
        return {
            state: 'unknown',
            label: account.data.summary || '状态待确认',
        };
    }
    if (account.data.state === 'authenticated')
        return { state: 'connected', label: authenticatedLabel(account.data) };
    return { state: 'unverified', label: '已配置' };
}
/** Native modal owns focus, dismissal, theme, elevation and entrance animation. */
export function SettingsDialog(props) {
    const fallbackSaves = useMemo(() => new SettingsPreferenceSaves(), [props.api, props.sessionId]);
    // Discovery and terminals unmount on close. Explicit preference writes finish in the background.
    return props.open ? _jsx(OpenSettingsDialog, { ...props, fallbackSaves: fallbackSaves }) : null;
}
function OpenSettingsDialog({ onClose, api, sessionId, initialCli, openNativeSettings, fallbackSaves, }) {
    const [cli, setCli] = useState(isRetiredCli(initialCli) ? 'hermes' : initialCli);
    const [page, setPage] = useState('cli');
    const [cliExpanded, setCliExpanded] = useState(true);
    const cliGroupId = useId();
    const [enabled, setEnabled] = useState();
    const [order, setOrder] = useState(CLI_IDS);
    const [settingsError, setSettingsError] = useState('');
    const [togglingCli, setTogglingCli] = useState();
    const [toggleErrors, setToggleErrors] = useState({});
    const [accounts, setAccounts] = useState({});
    const [catalogEntries, setCatalogEntries] = useState({});
    const [warmCatalogs, setWarmCatalogs] = useState(false);
    const [preferenceSaves, setPreferenceSaves] = useState(fallbackSaves);
    const displayCache = useRef();
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;
    const probes = useRef(new AccountQueryQueue());
    const toggleController = useRef();
    const accountClose = useRef();
    const leaving = useRef(false);
    const leave = async (transition) => {
        if (leaving.current)
            return;
        leaving.current = true;
        try {
            if (accountClose.current && !(await accountClose.current()))
                return;
            transition();
        }
        finally {
            leaving.current = false;
        }
    };
    const readCatalog = useCallback(async (id, signal, force = false, cache = displayCache.current, version = cache?.version(id)) => {
        try {
            if (cache && cache.version(id) !== version)
                throw new Error('设置来源已变化，请刷新状态');
            const next = JSON.parse(value(await (force
                ? api.cliworker.refreshCatalogForCli(sessionId, id, signal)
                : api.cliworker.catalogForCli(sessionId, id, signal))));
            if (next.cli !== id || !Array.isArray(next.models))
                throw new Error('收到不匹配的 CLI 模型目录，请重试');
            if (signal.aborted)
                return;
            if (cache && cache.version(id) !== version)
                throw new Error('设置来源已变化，请刷新状态');
            const entry = { data: next, loading: false };
            cache?.catalog(id, entry, version);
            setCatalogEntries(old => ({ ...old, [id]: entry }));
        }
        catch (error) {
            if (signal.aborted)
                return;
            const entry = { loading: false, error: operationMessage(error) };
            cache?.catalog(id, entry, version);
            setCatalogEntries(old => ({ ...old, [id]: entry }));
        }
    }, [api, sessionId]);
    const refreshCatalog = useCallback((id, force = false) => {
        if (!enabledRef.current?.[id])
            return;
        if (force)
            (displayCache.current?.preferenceSaves ?? fallbackSaves).invalidate(id);
        if (probes.current.enqueue(id, signal => readCatalog(id, signal, force), force))
            setCatalogEntries(old => ({ ...old, [id]: { loading: true } }));
    }, [readCatalog, fallbackSaves]);
    const refreshAccount = useCallback((id, replace = false, clearPrevious = false) => {
        if (!enabledRef.current?.[id])
            return;
        if (probes.current.has(id) && !replace)
            return;
        displayCache.current?.invalidate(id, replace || clearPrevious);
        if (!displayCache.current && (replace || clearPrevious))
            fallbackSaves.invalidate(id);
        const cache = displayCache.current, version = cache?.version(id);
        setAccounts((old) => ({
            ...old,
            [id]: { data: clearPrevious ? undefined : old[id]?.data, loading: true },
        }));
        if (displayCache.current)
            setCatalogEntries(old => ({ ...old, [id]: { loading: true } }));
        probes.current.enqueue(id, async (signal) => {
            try {
                const next = JSON.parse(value(await api.cliworker.accountStatus(sessionId, id, signal)));
                if (next.cli !== id)
                    throw new Error('收到不匹配的 CLI 账号状态，请重试');
                if (cache && cache.version(id) !== version)
                    throw new Error('账号来源已变化，请刷新状态');
                if (!signal.aborted) {
                    const entry = { data: next, loading: false };
                    cache?.account(id, entry, version);
                    setAccounts((old) => ({ ...old, [id]: entry }));
                }
            }
            catch (error) {
                if (!signal.aborted) {
                    const entry = { loading: false, error: operationMessage(error) };
                    cache?.account(id, entry, version);
                    setAccounts((old) => ({ ...old, [id]: entry }));
                }
            }
            if (!signal.aborted && cache)
                await readCatalog(id, signal, replace, cache, version);
        }, replace);
    }, [api, sessionId, readCatalog, fallbackSaves]);
    useEffect(() => {
        const controller = new AbortController();
        void (async () => {
            try {
                const readVersion = preferenceReadVersion();
                const raw = value(await api.cliworker.cliSettings(sessionId, controller.signal));
                const next = readEnabled(raw);
                const metadata = settingsCacheMetadata(JSON.parse(raw).settingsCache);
                if (controller.signal.aborted)
                    return;
                displayCache.current = metadata ? settingsDisplayPool(api).resolve(metadata, next, readVersion) : undefined;
                const saves = displayCache.current?.preferenceSaves ?? fallbackSaves;
                if (!metadata)
                    for (const id of CLI_IDS)
                        saves.sync(id, readVersion);
                setPreferenceSaves(saves);
                setAccounts(displayCache.current?.accountSnapshot() ?? {});
                setCatalogEntries(displayCache.current?.catalogSnapshot() ?? {});
                setWarmCatalogs(metadata !== undefined);
                enabledRef.current = next;
                setEnabled(next);
                // Keep this ordering for the lifetime of the open dialog. A toggle does
                // not move the row under the pointer; reopening applies the saved order.
                setOrder([...CLI_IDS].sort((a, b) => Number(next[b]) - Number(next[a])));
            }
            catch (error) {
                if (!controller.signal.aborted)
                    setSettingsError(operationMessage(error));
            }
        })();
        return () => {
            controller.abort();
            toggleController.current?.abort();
            probes.current.clear();
        };
    }, [api, sessionId, fallbackSaves]);
    useEffect(() => {
        if (!enabled)
            return;
        probes.current.prioritize(cli);
        for (const id of [cli, ...CLI_IDS.filter((id) => id !== cli)]) {
            if (enabled[id]) {
                if (!accounts[id])
                    refreshAccount(id);
                else if (warmCatalogs && !catalogEntries[id])
                    refreshCatalog(id);
            }
            else {
                probes.current.cancel(id);
                displayCache.current?.invalidate(id);
                if (!displayCache.current)
                    fallbackSaves.invalidate(id);
                if (accounts[id])
                    setAccounts((old) => {
                        const next = { ...old };
                        delete next[id];
                        return next;
                    });
            }
        }
        // A completed or failed probe is cached until explicitly refreshed. This
        // Selection only reprioritizes pending work; it does not repeat settled reads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, cli, refreshAccount, refreshCatalog, warmCatalogs]);
    async function toggleCli(id, nextValue) {
        if (!enabled || toggleController.current)
            return;
        const controller = new AbortController();
        toggleController.current = controller;
        setTogglingCli(id);
        setToggleErrors((old) => ({ ...old, [id]: '' }));
        try {
            const next = readEnabled(value(await api.cliworker.setCliEnabled(sessionId, id, nextValue, controller.signal)));
            if (!controller.signal.aborted) {
                enabledRef.current = next;
                setEnabled(next);
            }
        }
        catch (error) {
            if (!controller.signal.aborted)
                setToggleErrors((old) => ({ ...old, [id]: operationMessage(error) }));
        }
        finally {
            if (!controller.signal.aborted) {
                toggleController.current = undefined;
                setTogglingCli(undefined);
            }
        }
    }
    return (_jsx(Modal, { open: true, onClose: () => void leave(onClose), title: "CLI Worker \u8BBE\u7F6E", closeLabel: "\u5173\u95ED\u8BBE\u7F6E", className: "cwn-settings-dialog", contentClassName: "cwn-settings-content", children: _jsxs("div", { className: "cwn-settings-layout", children: [_jsxs("nav", { className: "cwn-settings-nav", "aria-label": "CLI \u8BBE\u7F6E\u5BFC\u822A", children: [_jsxs(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-nav-primary", "aria-label": "\u667A\u80FD\u4F53\u8BBE\u7F6E", "aria-pressed": page === 'roles', onClick: () => void leave(() => setPage('roles')), children: [_jsx("span", { className: "cwn-settings-nav-icon", "aria-hidden": "true", children: _jsx(IconUserOutlineRegular, { size: 20 }) }), _jsx("span", { className: "cwn-settings-nav-label", children: "\u667A\u80FD\u4F53\u8BBE\u7F6E" })] }), _jsxs(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-nav-primary", "aria-label": "CLI \u8FDE\u63A5", "aria-expanded": cliExpanded, "aria-controls": cliGroupId, onClick: () => setCliExpanded((expanded) => !expanded), children: [_jsx("span", { className: "cwn-settings-nav-icon", "aria-hidden": "true", children: _jsx(IconLinkOutlineRegular, { size: 20 }) }), _jsx("span", { className: "cwn-settings-nav-label", children: "CLI \u8FDE\u63A5" }), _jsx(IconChevronDownOutlineRegular, { size: 14, className: "cwn-settings-nav-chevron" })] }), _jsx("div", { id: cliGroupId, className: "cwn-settings-cli-group", "data-expanded": cliExpanded, "aria-hidden": !cliExpanded, ...(!cliExpanded ? { inert: '' } : {}), children: _jsx("div", { className: "cwn-settings-cli-group-inner", children: order.map((id) => {
                                    const connection = connectionStatus(enabled?.[id], accounts[id], settingsError);
                                    return (_jsxs(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-settings-cli-item", "aria-label": `${CLI_LABELS[id]} 设置`, "aria-pressed": page === 'cli' && cli === id, tabIndex: cliExpanded ? undefined : -1, "data-enabled": enabled?.[id] !== false, onClick: () => void leave(() => {
                                            setCli(id);
                                            setPage('cli');
                                        }), children: [_jsx(BrandIcon, { cli: id, size: 22 }), _jsx("span", { className: "cwn-settings-nav-label", children: CLI_LABELS[id] }), _jsx(Tooltip, { label: connection.label, side: "right", portal: true, children: _jsx("span", { className: "cwn-settings-nav-status", role: "img", "aria-label": connection.label, children: connection.state === 'pending' ? (_jsx(StateDot, { state: "ongoing", size: 12 })) : (_jsx("span", { className: "cwn-connection-dot", "data-state": connection.state })) }) })] }, id));
                                }) }) })] }), page === 'roles' ? (_jsx(RolePresetsPane, { api: api, sessionId: sessionId })) : (_jsx(CliSettings, { accountClose: accountClose, openNativeSettings: openNativeSettings, api: api, sessionId: sessionId, cli: cli, enabled: enabled?.[cli], account: accounts[cli], warmCatalogs: warmCatalogs, catalogEntry: catalogEntries[cli], preferenceSaves: preferenceSaves, onRefreshModels: () => refreshCatalog(cli, true), onPreferenceSaved: preference => {
                        const id = preference.cli ?? 'antigravity';
                        displayCache.current?.preference(id, preference);
                        if (!mounted.current)
                            return;
                        setCatalogEntries(old => {
                            const entry = old[id];
                            return entry?.data ? { ...old, [id]: { ...entry, data: { ...entry.data, preference } } } : old;
                        });
                    }, connection: connectionStatus(enabled?.[cli], accounts[cli], settingsError), onRefreshAccount: (replace = true, clearPrevious) => refreshAccount(cli, replace, clearPrevious), onToggle: (next) => void toggleCli(cli, next), toggleBusy: !!togglingCli, toggling: togglingCli === cli, settingsError: settingsError, toggleError: toggleErrors[cli] || '' }, `${sessionId}:${cli}`))] }) }));
}
function SectionProgress({ loading, label }) {
    return (_jsx("span", { className: "cwn-section-progress", role: "status", "aria-label": loading ? label : undefined, children: loading && _jsx(StateDot, { state: "ongoing", size: 14 }) }));
}
/** Render only the Host's safe identity projection, never raw CLI output. */
function AccountSummary({ account, enabled, loading, settingsError, logout, connection, }) {
    const data = account?.data;
    const current = enabled === true && !settingsError && !account?.error;
    const authenticated = current && data?.state === 'authenticated';
    const apiLogin = authenticated && data.authMethod === 'api';
    const providerLogins = authenticated ? providerLoginSummary(data) : undefined;
    const state = connection.state;
    const label = enabled === false
        ? '已关闭'
        : settingsError
            ? '设置读取失败，请重新打开'
            : loading && !data
                ? '正在读取登录信息…'
                : account?.error
                    ? account.error
                    : connection.state === 'failed'
                        ? connection.label
                        : connection.state === 'pending'
                            ? '正在检查连接…'
                            : authenticated
                                ? authenticatedLabel(data)
                                : data?.state === 'unconfigured'
                                    ? data.installed
                                        ? data.cli === 'claude'
                                            ? data.summary
                                            : '未登录'
                                        : '未安装'
                                    : data?.state === 'configured'
                                        ? '已配置'
                                        : data?.summary || '状态待确认';
    return (_jsx("div", { className: "cwn-account-summary", "data-account-state": current ? data?.state : undefined, "data-provider-logins": !!providerLogins, role: "status", children: _jsxs("div", { className: "cwn-account-status-line", children: [_jsxs("span", { className: "cwn-account-login", "data-state": state, children: [_jsx("span", { className: "cwn-account-status-dot", "data-state": state, "aria-hidden": "true" }), providerLogins ? (_jsx("span", { className: "cwn-account-logins", title: providerLogins.detail, "aria-label": label, children: label })) : (label)] }), authenticated && !data.logins?.length && !apiLogin && data.accountLabel && (_jsx("span", { className: "cwn-account-label", title: data.accountLabel, children: data.accountLabel })), authenticated && logout] }) }));
}
function CliSettings({ accountClose, openNativeSettings, api, sessionId, cli, enabled, account, warmCatalogs, catalogEntry, preferenceSaves, onRefreshModels, onPreferenceSaved, connection, onRefreshAccount, onToggle, toggleBusy, toggling, settingsError, toggleError, }) {
    const [catalog, setCatalog] = useState();
    const [modelLoading, setModelLoading] = useState(true);
    const [writeState, setWriteState] = useState(() => preferenceSaves.snapshot(cli));
    const saving = writeState.saving;
    const saved = writeState.status === 'saved';
    const saveError = writeState.error;
    const [modelError, setModelError] = useState('');
    const [modelRevision, refreshModels] = useState(0);
    const forceCatalogRefresh = useRef(false);
    const [model, setModel] = useState('');
    const [effort, setEffort] = useState('default');
    const [action, setAction] = useState();
    const [chosenAction, setChosenAction] = useState();
    const [accountSource, setAccountSource] = useState();
    const [loginProvider, setLoginProvider] = useState();
    const [pathChanging, setPathChanging] = useState(false);
    const selection = useRef({ model: '', effort: 'default' });
    useEffect(() => {
        const update = () => setWriteState(preferenceSaves.snapshot(cli));
        const unsubscribe = preferenceSaves.subscribe(cli, update);
        update();
        return () => {
            unsubscribe();
            preferenceSaves.flush(cli);
        };
    }, [preferenceSaves, cli]);
    useEffect(() => {
        // A refreshed account/catalog owns a new model scope. Only subsequent
        // human choice events may write a preference in that scope.
        selection.current = { model: '', effort: 'default' };
        setCatalog(undefined);
        setModel('');
        setEffort('default');
        setModelError('');
        if (!enabled) {
            setModelLoading(false);
            return;
        }
        setModelLoading(true);
        // A changed account invalidates the old model scope. Start discovery only
        // after this account check settles, including a fresh independent read if
        // the CLI cannot report an account identity.
        if (!account || account.loading)
            return;
        const applyCatalog = (next) => {
            setCatalog(next);
            if (!next.models.length)
                setModelError(operationMessage(next.notice || '此 CLI 未返回可用模型，请登录或刷新重试'));
            const preference = preferenceSaves.snapshot(cli).preference ?? next.preference;
            const preferred = preference ? modelName(preference) : '';
            const saved = next.models.find((item) => item.id === preferred ||
                Object.values(item.variants ?? {}).includes(preference?.model ?? ''));
            const chosen = preference ? saved : visibleModelChoices(next.models)[0];
            if (preference && !saved && next.models.length)
                setModelError('原默认模型已不可用，请重新选择模型');
            const effort = preference && chosen?.efforts?.includes(preference.effort)
                ? preference.effort
                : (chosen?.efforts?.[0] ?? 'default');
            selection.current = { model: chosen?.id ?? '', effort };
            setModel(selection.current.model);
            setEffort(effort);
        };
        if (warmCatalogs) {
            if (!catalogEntry || catalogEntry.loading)
                return;
            if (catalogEntry.data)
                applyCatalog(catalogEntry.data);
            else
                setModelError(catalogEntry.error || '模型目录不可用，请刷新重试');
            setModelLoading(false);
            return;
        }
        const controller = new AbortController();
        void (async () => {
            try {
                const force = forceCatalogRefresh.current;
                forceCatalogRefresh.current = false;
                const next = JSON.parse(value(await (force
                    ? api.cliworker.refreshCatalogForCli(sessionId, cli, controller.signal)
                    : api.cliworker.catalogForCli(sessionId, cli, controller.signal))));
                if (next.cli !== cli)
                    throw new Error('收到不匹配的 CLI 模型目录，请重试');
                if (controller.signal.aborted)
                    return;
                applyCatalog(next);
            }
            catch (error) {
                if (!controller.signal.aborted) {
                    setCatalog(undefined);
                    setModel('');
                    setModelError(operationMessage(error));
                }
            }
            finally {
                if (!controller.signal.aborted)
                    setModelLoading(false);
            }
        })();
        return () => {
            controller.abort();
        };
    }, [api, sessionId, cli, enabled, account, modelRevision, preferenceSaves, warmCatalogs,
        catalogEntry?.loading, catalogEntry?.error, catalogEntry?.data?.models, catalogEntry?.data?.notice]);
    const inactive = !enabled || toggling;
    const settingsPending = enabled === undefined && !settingsError;
    const accountLoading = !settingsError && enabled !== false && (!account || account.loading);
    const supportedEfforts = catalog?.models.find((item) => item.id === model)?.efforts ?? [];
    const choiceDisabled = inactive || pathChanging || modelLoading || accountLoading || !!action || !catalog;
    function savePreference(preference) {
        preferenceSaves.stage(preference, async (next, signal) => {
            const saved = JSON.parse(value(await api.cliworker.configure(sessionId, JSON.stringify(next), signal)));
            return saved?.cli === cli && typeof saved.model === 'string' ? saved : next;
        }, onPreferenceSaved);
    }
    const changeModel = (id) => {
        if (choiceDisabled)
            return;
        const chosen = catalog?.models.find((item) => item.id === id);
        if (!chosen?.efforts?.length)
            return;
        const effort = chosen.efforts.includes(selection.current.effort)
            ? selection.current.effort
            : chosen.efforts[0];
        selection.current = { model: id, effort };
        setModel(id);
        setEffort(effort);
        setModelError('');
        savePreference({ cli, model: id, effort });
    };
    const changeEffort = (id) => {
        if (choiceDisabled)
            return;
        const chosen = catalog?.models.find((item) => item.id === selection.current.model);
        const effort = chosen?.efforts?.find((effort) => effort === id);
        if (!chosen || !effort)
            return;
        selection.current = { model: chosen.id, effort };
        setEffort(effort);
        savePreference({ cli, model: chosen.id, effort });
    };
    const finishedAccountAction = () => {
        onRefreshAccount(true);
    };
    const closeAccount = () => {
        setAction(undefined);
        setAccountSource(undefined);
        setLoginProvider(undefined);
        onRefreshAccount(true);
    };
    const sources = chosenAction?.sources?.filter((source, index, all) => ['native', 'plugin'].includes(source.id) && all.findIndex((item) => item.id === source.id) === index);
    const choosingSource = action === 'logout' && chosenAction?.sources !== undefined && !accountSource;
    const choosingLoginProvider = cli === 'zcode' && action === 'login' && !loginProvider;
    const accountAction = (id) => {
        const item = account?.data?.actions.find((candidate) => candidate.id === id);
        const label = item?.target === 'models'
            ? id === 'login'
                ? '登录设置'
                : '打开原生设置'
            : (item?.label ??
                (id === 'logout'
                    ? '退出登录'
                    : id === 'manage'
                        ? '账号终端'
                        : ['omp', 'pi', 'hermes', 'opencode'].includes(cli)
                            ? '登录设置'
                            : '登录 / 切换账号'));
        return (_jsx(Button, { type: "button", variant: id === 'logout' ? 'ghost' : 'outline', size: "md", className: id === 'logout'
                ? 'cwn-account-logout'
                : id === 'manage'
                    ? 'cwn-account-manage'
                    : 'cwn-account-login-action', "aria-label": label, disabled: inactive ||
                accountLoading ||
                !!account?.error ||
                !!action ||
                saving ||
                pathChanging ||
                !item ||
                (item.target === 'models' && !openNativeSettings), onClick: () => {
                if (!inactive && item) {
                    if (item.target === 'models') {
                        openNativeSettings?.();
                        return;
                    }
                    preferenceSaves.invalidate(cli);
                    setChosenAction(item);
                    setLoginProvider(undefined);
                    setAccountSource(id === 'logout' &&
                        item.sources?.length === 1 &&
                        ['native', 'plugin'].includes(item.sources[0].id)
                        ? item.sources[0].id
                        : undefined);
                    setAction(item.id);
                }
            }, children: id === 'logout' ? (_jsxs(_Fragment, { children: [_jsx(Glyph, { name: "logout" }), "\u9000\u51FA"] })) : item?.target === 'models' ? (label) : id === 'manage' ? (_jsxs(_Fragment, { children: [_jsx(Glyph, { name: "tool" }), "\u8D26\u53F7\u7EC8\u7AEF"] })) : item?.label && item.label !== '登录 / 切换账号' ? (item.label) : account?.data?.state === 'authenticated' ? ('切换账号') : ('登录账号') }));
    };
    return (_jsxs("div", { className: "cwn-settings-pane", "aria-label": `${CLI_LABELS[cli]} 配置`, children: [_jsxs("div", { className: "cwn-cli-identity", "data-enabled": enabled !== false, children: [_jsxs("div", { className: "cwn-settings-cli-name", children: [_jsx(BrandIcon, { cli: cli, size: 40 }), _jsxs("div", { children: [_jsx("h2", { children: CLI_LABELS[cli] }), _jsx("p", { className: "cwn-cli-subtitle", children: "\u7BA1\u7406\u8D26\u53F7\u4E0E\u6A21\u578B\u504F\u597D" })] })] }), _jsxs("div", { className: "cwn-cli-toggle", children: [_jsx(SectionProgress, { loading: settingsPending || toggling, label: toggling ? '正在保存 CLI 开关' : '正在读取 CLI 开关' }), _jsx(Switch, { checked: enabled ?? false, onChange: onToggle, label: `启用 ${CLI_LABELS[cli]}`, disabled: enabled === undefined || toggleBusy || saving || !!action || pathChanging, title: action ? '请先关闭账号终端' : undefined })] })] }), _jsx("div", { className: "cwn-cli-toggle-status", role: "status", children: settingsError || toggleError || (enabled === false ? '已关闭' : '') }), _jsxs("section", { className: "cwn-settings-section", "aria-label": "\u8D26\u53F7\u4E0E\u767B\u5F55", children: [_jsxs("div", { className: "cwn-settings-section-head", children: [_jsx("h3", { children: "\u8D26\u53F7\u4E0E\u767B\u5F55" }), _jsxs("div", { className: "cwn-settings-section-tools", children: [_jsx(SectionProgress, { loading: accountLoading, label: `正在读取 ${CLI_LABELS[cli]} 账号…` }), _jsx(Tooltip, { label: "\u5237\u65B0\u767B\u5F55\u72B6\u6001", side: "top", portal: true, children: _jsx(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-refresh", "aria-label": "\u5237\u65B0\u72B6\u6001", disabled: inactive || accountLoading || saving || pathChanging, onClick: () => onRefreshAccount(), children: _jsx(IconRefreshOutlineRegular, { size: 16 }) }) })] })] }), _jsxs("div", { className: "cwn-account-row", children: [_jsx(AccountSummary, { account: account, connection: connection, enabled: enabled, loading: accountLoading, settingsError: settingsError, logout: accountAction('logout') }), _jsxs("div", { className: "cwn-account-actions", children: [accountAction('login'), accountAction('manage')] })] }), action && enabled && (_jsx(Modal, { open: true, onClose: () => {
                            if (accountClose.current)
                                void accountClose.current();
                            else
                                closeAccount();
                        }, title: `${CLI_LABELS[cli]} · ${chosenAction?.label ?? '账号终端'}`, closeLabel: "\u5173\u95ED\u8D26\u53F7\u64CD\u4F5C", className: "cwn-account-dialog", contentClassName: "cwn-account-dialog-content", children: choosingLoginProvider ? (_jsxs("section", { "aria-label": "\u9009\u62E9 ZCode \u6388\u6743\u6765\u6E90", children: [_jsx("p", { children: "\u9009\u62E9\u8D26\u53F7\u6240\u5C5E\u7684\u670D\u52A1\u5546" }), _jsxs("div", { className: "cwn-account-actions", children: [_jsx(Button, { variant: "outline", size: "md", onClick: () => setLoginProvider('bigmodel'), children: "\u4E2D\u56FD\u667A\u8C31 BigModel" }), _jsx(Button, { variant: "outline", size: "md", onClick: () => setLoginProvider('zai'), children: "\u6D77\u5916 Z.AI" })] })] })) : choosingSource ? (_jsxs("section", { "aria-label": "\u9009\u62E9\u9000\u51FA\u8D26\u53F7\u6765\u6E90", children: [_jsx("p", { children: sources?.length ? '选择要退出的账号来源' : '账号来源不可用，请关闭后刷新状态' }), _jsx("div", { className: "cwn-account-actions", children: sources?.map((source) => (_jsx(Button, { variant: "outline", size: "md", onClick: () => setAccountSource(source.id), children: source.label }, source.id))) })] })) : (_jsx(AccountTerminal, { closeControl: accountClose, api: api, sessionId: sessionId, cli: cli, action: action, source: accountSource, provider: loginProvider, onClose: closeAccount, onFinished: finishedAccountAction })) }))] }), _jsxs("section", { className: "cwn-settings-section", "aria-label": "\u9879\u76EE\u9ED8\u8BA4\u8BBE\u7F6E", children: [_jsxs("div", { className: "cwn-settings-section-head", children: [_jsx("h3", { children: "\u9879\u76EE\u9ED8\u8BA4\u8BBE\u7F6E" }), _jsxs("div", { className: "cwn-settings-section-tools", children: [_jsx(SectionProgress, { loading: !settingsError && enabled !== false && (modelLoading || settingsPending), label: `正在读取 ${CLI_LABELS[cli]} 模型…` }), _jsx(Tooltip, { label: "\u5237\u65B0\u6A21\u578B\u5217\u8868", side: "top", portal: true, children: _jsx(Button, { type: "button", variant: "ghost", size: "md", className: "cwn-refresh", "aria-label": "\u5237\u65B0\u6A21\u578B", disabled: inactive || modelLoading || saving || pathChanging, onClick: () => {
                                                preferenceSaves.invalidate(cli);
                                                if (warmCatalogs)
                                                    onRefreshModels();
                                                else {
                                                    forceCatalogRefresh.current = true;
                                                    refreshModels((n) => n + 1);
                                                }
                                            }, children: _jsx(IconRefreshOutlineRegular, { size: 16 }) }) })] })] }), _jsxs("form", { className: "cwn-settings-form", onSubmit: (event) => {
                            event.preventDefault();
                        }, children: [_jsxs("label", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: "\u6A21\u578B" }), _jsx("span", { className: "cwn-setting-description", children: "\u65B0\u5BF9\u8BDD\u6CBF\u7528\u7684\u9ED8\u8BA4\u6A21\u578B" })] }), _jsx(NativeChoice, { label: "\u9ED8\u8BA4\u6A21\u578B", selected: model, choices: visibleModelChoices(catalog?.models ?? [], model).map((item) => ({
                                            id: item.id,
                                            label: item.label,
                                        })), disabled: choiceDisabled, onChange: changeModel })] }), _jsxs("label", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: "\u601D\u8003\u5F3A\u5EA6" }), _jsx("span", { className: "cwn-setting-description", children: "\u4EC5\u63D0\u4F9B\u5F53\u524D\u6A21\u578B\u652F\u6301\u7684\u9009\u9879" })] }), _jsx(NativeChoice, { label: "\u9ED8\u8BA4\u601D\u8003\u5F3A\u5EA6", selected: effort, choices: supportedEfforts.map((id) => ({ id, label: effortLabel(id) })), disabled: choiceDisabled || !supportedEfforts.length, onChange: changeEffort })] }), _jsx("p", { className: "cwn-settings-notice cwn-settings-hint", role: "status", children: modelError || (cli === 'claude' && catalog?.notice?.includes('路由') ? catalog.notice : '') }), (saving || saved || saveError) && (_jsx("div", { className: "cwn-settings-save", children: _jsxs("span", { className: "cwn-settings-feedback-slot", role: "status", children: [saving && _jsx(StateDot, { state: "ongoing", size: 14 }), saveError || (saving ? '正在保存默认设置…' : '默认设置已保存')] }) }))] })] }), _jsx(CliExecutableSettings, { api: api, sessionId: sessionId, cli: cli, blocked: !!action || saving || toggling, accountLoading: accountLoading, accountRevision: account, onApplied: () => {
                    if (enabled)
                        onRefreshAccount(true, true);
                }, onBusyChange: setPathChanging })] }));
}
//# sourceMappingURL=settings-dialog.js.map