import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { GUIDED_ACCOUNT_CLIS, parseAccountLoginId } from "../../shared/account-links.js";
import { CLI_LABELS } from "../../shared/types.js";
import { AccountTerminal } from "../account-terminal.js";
import { t, useT } from "../i18n.js";
import { hostText } from "../operation-error.js";
/** The account window's own choice for a native picker. */
const NATIVE = '__native__';
const order = (source) => (source === 'native' ? 0 : source === 'plugin' ? 1 : 2);
const credentialNumber = (login) => {
    const parsed = login.id ? parseAccountLoginId(login.id) : undefined;
    return parsed?.cli === 'omp' ? parsed.entry?.match(/^(?:native|plugin)\.([1-9]\d*)$/)?.[1] : undefined;
};
const loginText = (login) => {
    const text = login.authMethod === 'api'
        ? t('{provider} API 登录', { provider: hostText(login.providerLabel) })
        : t('{provider}账号登录', { provider: hostText(login.providerLabel) });
    const id = credentialNumber(login);
    return id ? `${text} · ${t('凭据 #{id}', { id })}` : text;
};
/**
 * The 「账号」 window of a CLI that keeps several logins (2026-10-26 decision):
 * every login with its own 退出, and 添加账号 with a 「登录到」 provider picker.
 */
export function AccountsWindow({ api, sessionId, cli, status, closeControl, onRefresh, onClose, }) {
    useT();
    const name = CLI_LABELS[cli];
    // Kimi reports API providers as configured, not verified; their rows are still signed out one by one.
    const logins = status?.state === 'authenticated' || status?.state === 'configured' ? (status.logins ?? []) : [];
    // A signed-in CLI that reports no separate logins still has one row to sign out.
    const whole = !logins.length && status?.state === 'authenticated';
    const rows = whole
        ? [{ providerLabel: '', authMethod: status.authMethod ?? 'oauth', accountLabel: status.accountLabel }]
        : logins;
    const providers = status?.actions.find((item) => item.id === 'login')?.providers;
    const sources = status?.actions.find((item) => item.id === 'logout')?.sources ?? [];
    const [request, setRequest] = useState();
    const [adding, setAdding] = useState(false);
    const [confirming, setConfirming] = useState();
    const closingAll = useRef(false);
    const terminalClose = useRef(undefined);
    // The dialog's close button ends a running window first, then the whole dialog.
    useEffect(() => {
        const request = async () => {
            if (!terminalClose.current) {
                onClose();
                return true;
            }
            closingAll.current = true;
            return terminalClose.current();
        };
        closeControl.current = request;
        return () => {
            if (closeControl.current === request)
                closeControl.current = undefined;
        };
    });
    const back = () => {
        if (closingAll.current)
            return onClose();
        setRequest(undefined);
        setAdding(false);
        setConfirming(undefined);
        onRefresh();
    };
    if (request)
        return (_jsxs("div", { className: "cwn-accounts-run", children: [_jsx("div", { className: "cwn-accounts-run-head", children: _jsx("span", { children: request.title }) }), _jsx(AccountTerminal, { api: api, sessionId: sessionId, cli: cli, action: request.action, source: request.source, provider: request.provider, login: request.login, replaces: request.replaces, closeControl: terminalClose, onClose: back, onFinished: onRefresh })] }));
    if (adding)
        return (_jsx(AddAccount, { cli: cli, providers: providers, logins: logins, onCancel: () => setAdding(false), onStart: (next) => setRequest(next) }));
    const signOut = (login) => {
        if (login.id)
            return setRequest({
                action: 'logout',
                login: login.id,
                title: t('退出 {account}', { account: loginText(login) }),
            });
        if (GUIDED_ACCOUNT_CLIS.has(cli))
            return setRequest({ action: 'logout', title: t('退出 {cli}', { cli: name }) });
        // No single-login removal for this row: the CLI's own menu, in the row's own location.
        const source = login.source ?? (sources.length === 1 ? sources[0].id : undefined);
        setRequest({
            action: 'logout',
            ...(source ? { source } : {}),
            title: t('在原生终端中退出 {cli}', { cli: name }),
        });
    };
    // A key from an environment variable or a config file is not a stored login: nothing to sign out here.
    const configOnly = (login) => !login.id && !login.source && !whole && (cli === 'pi' || cli === 'omp');
    const card = ({ login, index }) => {
        const removable = !!login.id || GUIDED_ACCOUNT_CLIS.has(cli);
        const title = whole ? t('当前账号') : hostText(login.providerLabel);
        const meta = [
            login.authMethod === 'api' ? 'API Key' : t('账号登录'),
            credentialNumber(login) ? t('凭据 #{id}', { id: credentialNumber(login) }) : undefined,
            login.authMethod === 'oauth' ? login.accountLabel : undefined,
            configOnly(login) ? t('在原配置中管理') : undefined,
        ].filter(Boolean);
        return (_jsxs("li", { className: "cwn-accounts-card", "data-confirming": confirming === index || undefined, children: [_jsxs("div", { className: "cwn-accounts-card-main", children: [_jsx("span", { className: "cwn-accounts-mark", "aria-hidden": "true", children: (title || name).trim().charAt(0).toUpperCase() }), _jsxs("div", { className: "cwn-accounts-row-text", children: [_jsx("strong", { children: title }), _jsx("span", { children: meta.join(' · ') })] }), confirming !== index &&
                            !configOnly(login) &&
                            (removable ? (_jsx(Button, { variant: "ghost", size: "md", onClick: () => setConfirming(index), children: t('退出') })) : (!native && (_jsx(Button, { variant: "ghost", size: "md", onClick: () => signOut(login), children: t('在原生终端中退出') }))))] }), confirming === index && (_jsxs("div", { className: "cwn-accounts-confirm", role: "group", "aria-label": t('确认退出'), children: [_jsx("span", { children: cli === 'zcode' && !login.id
                                ? t('BigModel 和 Z.AI 的登录会一起退出。')
                                : t('退出后会删除这条凭据，其他账号保留。') }), _jsxs("div", { className: "cwn-login-actions", children: [_jsx(Button, { variant: "ghost", size: "md", onClick: () => setConfirming(undefined), children: t('取消') }), _jsx(Button, { variant: "primary", size: "md", onClick: () => signOut(login), children: t('确认退出') })] })] }))] }, login.id ?? `${login.source ?? ''}-${login.providerLabel}-${index}`));
    };
    // Older Hosts give no location per row: one native button per location instead.
    const native = !GUIDED_ACCOUNT_CLIS.has(cli) && sources.length > 1 && !rows.some((login) => login.source);
    // Where a login is stored decides who uses it: the CLI run directly, or only the plugin.
    const place = (source) => source === 'native'
        ? { title: t('{cli} 原生目录', { cli: name }), hint: t('直接运行 {cli} 时也会使用', { cli: name }) }
        : source === 'plugin'
            ? { title: t('插件目录'), hint: t('只在 CLI Worker 中使用') }
            : { title: t('其他配置'), hint: t('来自环境变量或配置文件') };
    // Logins kept in several locations are listed under each one.
    const groups = [];
    rows.forEach((login, index) => {
        const group = groups.find((item) => item.source === login.source);
        if (group)
            group.rows.push({ login, index });
        else
            groups.push({ source: login.source, rows: [{ login, index }] });
    });
    groups.sort((a, b) => order(a.source) - order(b.source));
    const grouped = groups.some((group) => group.source);
    return (_jsxs("div", { className: "cwn-accounts-window", children: [rows.length ? (grouped ? (groups.map((group) => {
                const { title, hint } = place(group.source);
                return (_jsxs("section", { className: "cwn-accounts-group", children: [_jsxs("div", { className: "cwn-accounts-group-head", children: [_jsx("h4", { className: "cwn-accounts-group-title", children: title }), _jsx("span", { children: hint })] }), _jsx("ul", { className: "cwn-accounts-list", "aria-label": title, children: group.rows.map(card) })] }, group.source ?? 'other'));
            })) : (_jsx("ul", { className: "cwn-accounts-list", "aria-label": t('{cli} 已登录账号', { cli: name }), children: groups.flatMap((group) => group.rows).map(card) }))) : (_jsx("p", { className: "cwn-accounts-empty", children: t('尚未登录 {cli} 的任何账号。', { cli: name }) })), native && rows.length > 0 && (_jsxs("div", { className: "cwn-accounts-native", children: [_jsx("span", { className: "cwn-login-hint", children: t('{cli} 只能在原生菜单中逐个退出，选择账号所在的位置：', { cli: name }) }), _jsx("div", { className: "cwn-login-actions", children: sources.map((source) => (_jsx(Button, { variant: "outline", size: "md", onClick: () => setRequest({
                                action: 'logout',
                                source: source.id,
                                title: t('在原生终端中退出 {cli}', { cli: name }),
                            }), children: hostText(source.label) }, source.id))) })] })), _jsxs("div", { className: "cwn-accounts-foot", children: [!providers?.length && _jsx("span", { className: "cwn-login-hint", children: t('在原生终端中选择服务商并登录。') }), _jsxs(Button, { variant: "outline", size: "md", onClick: () => providers?.length
                            ? setAdding(true)
                            : setRequest({ action: 'login', title: t('在原生终端中添加 {cli} 账号', { cli: name }) }), children: [_jsx(IconPlusOutlineRegular, { size: 16 }), t('添加账号')] })] })] }));
}
function AddAccount({ cli, providers, logins, onCancel, onStart, }) {
    const name = CLI_LABELS[cli];
    const list = providers ?? [];
    const [chosen, setChosen] = useState(list[0]?.id ?? NATIVE);
    const [replace, setReplace] = useState();
    const provider = list.find((item) => item.id === chosen);
    // Hermes keeps several keys of one provider: add another, or replace one of them.
    const held = provider?.multi
        ? logins.filter((login) => login.id && parseAccountLoginId(login.id)?.provider === provider.id)
        : [];
    useEffect(() => setReplace(undefined), [chosen]);
    const choices = [
        ...list.map((item) => ({
            id: item.id,
            name: hostText(item.label),
            label: item.signedIn ? t('{provider}（已登录）', { provider: hostText(item.label) }) : hostText(item.label),
            note: item.signedIn ? t('已登录') : undefined,
        })),
        // ZCode has only its two providers; other CLIs keep their own full picker.
        ...(cli === 'zcode'
            ? []
            : [
                {
                    id: NATIVE,
                    name: t('其他服务商'),
                    label: t('其他服务商（在原生终端中选择）'),
                    note: t('在原生终端中选择'),
                },
            ]),
    ];
    const start = () => {
        if (!provider)
            return onStart({ action: 'login', title: t('在原生终端中添加 {cli} 账号', { cli: name }) });
        onStart({
            action: 'login',
            provider: provider.id,
            ...(replace ? { replaces: replace } : {}),
            title: t('登录到 {provider}', { provider: hostText(provider.label) }),
        });
    };
    return (_jsxs("div", { className: "cwn-accounts-window", children: [_jsxs("div", { className: "cwn-accounts-lead", children: [_jsx("strong", { children: t('选择要登录的服务商') }), _jsx("span", { children: provider
                            ? t('在本窗口中完成授权或填写 API Key，原生终端在后台运行。')
                            : t('在原生终端中选择服务商并登录。') })] }), _jsx("div", { className: "cwn-accounts-providers", role: "radiogroup", "aria-label": t('登录到'), children: choices.map((choice) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": chosen === choice.id, "aria-label": choice.label, title: choice.name, className: "cwn-accounts-provider", "data-selected": chosen === choice.id || undefined, onClick: () => setChosen(choice.id), children: [_jsx("span", { className: "cwn-accounts-mark", "aria-hidden": "true", children: choice.id === NATIVE ? '…' : choice.name.trim().charAt(0).toUpperCase() }), _jsxs("span", { className: "cwn-accounts-provider-text", children: [_jsx("strong", { children: choice.name }), choice.note && _jsx("span", { "data-signed-in": choice.id !== NATIVE || undefined, children: choice.note })] })] }, choice.id))) }), provider?.signedIn && !provider.multi && (_jsx("p", { className: "cwn-login-callout", "data-tone": "warning", children: _jsx("span", { children: t('{provider} 已登录，继续会替换它现有的凭据。', { provider: hostText(provider.label) }) }) })), held.length > 0 && (_jsxs("div", { className: "cwn-accounts-panel cwn-accounts-mode", role: "radiogroup", "aria-label": t('{provider} 已有凭据', { provider: provider.label }), children: [_jsxs("label", { children: [_jsx("input", { type: "radio", name: "cwn-account-mode", checked: !replace, onChange: () => setReplace(undefined) }), t('添加另一个凭据')] }), held.map((login, index) => (_jsxs("label", { children: [_jsx("input", { type: "radio", name: "cwn-account-mode", checked: replace === login.id, onChange: () => setReplace(login.id) }), credentialNumber(login)
                                ? t('替换凭据 #{id}', { id: credentialNumber(login) })
                                : held.length === 1
                                    ? t('替换现有凭据')
                                    : login.accountLabel
                                        ? t('替换 {account}', { account: login.accountLabel })
                                        : t('替换第 {index} 个凭据', { index: String(index + 1) })] }, login.id))), replace && _jsx("span", { className: "cwn-login-hint", children: t('新凭据确认可用后，才会移除原凭据。') })] })), _jsxs("div", { className: "cwn-accounts-actions", children: [_jsx(Button, { variant: "ghost", size: "md", onClick: onCancel, children: t('返回') }), _jsx(Button, { variant: "primary", size: "md", onClick: start, children: t('继续') })] })] }));
}
//# sourceMappingURL=accounts-window.js.map