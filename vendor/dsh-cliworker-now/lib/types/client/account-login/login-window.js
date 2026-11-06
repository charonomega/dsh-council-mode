import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, IconCheckCircleFillRegular, IconCheckOutlineRegular, Input, StateDot, writeClipboard, } from '@deepseek-ai/dsh-client-ui-primitives';
import { ACCOUNT_LOGIN_HOSTS, allowedLink } from "../../shared/account-links.js";
import { CLI_LABELS } from "../../shared/types.js";
import { t, useT } from "../i18n.js";
import { BrandIcon } from "../icons.js";
import { hostText } from "../operation-error.js";
const MAX_ANSWER_LENGTH = 4096;
/** The only addresses a window may open: the CLI's own sign-in pages, checked again here. */
export function loginLink(cli, value) {
    return allowedLink(value, ACCOUNT_LOGIN_HOSTS[cli]);
}
function Step({ index, state, title, children }) {
    return (_jsxs("li", { className: "cwn-login-step", "data-state": state, "aria-current": state === 'active' ? 'step' : undefined, children: [_jsx("span", { className: "cwn-login-step-mark", "aria-hidden": "true", children: state === 'done' ? _jsx(IconCheckOutlineRegular, { size: 14 }) : index }), _jsxs("div", { className: "cwn-login-step-main", children: [_jsx("span", { className: "cwn-login-step-title", children: title }), state === 'active' && children && _jsx("div", { className: "cwn-login-step-body", children: children })] })] }));
}
function Result({ tone, title, detail, children }) {
    return (_jsxs("div", { className: "cwn-login-result", "data-tone": tone, role: "status", "aria-live": "polite", children: [tone === 'success' && _jsx(IconCheckCircleFillRegular, { size: 40, className: "cwn-login-result-icon" }), _jsx("strong", { children: title }), detail && _jsx("p", { children: detail }), children && _jsx("div", { className: "cwn-login-actions", children: children })] }));
}
function CurrentAccount({ cli, account, onSwitch, onClose, }) {
    const name = CLI_LABELS[cli];
    const only = account?.logins?.length === 1 ? account.logins[0] : undefined;
    const method = account?.authMethod ?? only?.authMethod;
    const email = account?.accountLabel ?? (only?.authMethod === 'oauth' ? only.accountLabel : undefined);
    const meta = [method === 'api' ? 'API Key' : method ? t('账号登录') : undefined, email]
        .filter(Boolean)
        .join(' · ');
    return (_jsxs("div", { className: "cwn-accounts-window", role: "status", "aria-live": "polite", children: [_jsxs("div", { className: "cwn-accounts-lead", children: [_jsx("strong", { children: t('当前已登录 {cli}', { cli: name }) }), _jsx("span", { children: onSwitch
                            ? t('切换账号会先退出当前账号，确认退出后再登录新账号。')
                            : t('如需切换账号，请先退出登录。') })] }), _jsx("ul", { className: "cwn-accounts-list", "aria-label": t('当前账号'), children: _jsx("li", { className: "cwn-accounts-card", children: _jsxs("div", { className: "cwn-accounts-card-main", children: [_jsx("span", { className: "cwn-accounts-mark", "aria-hidden": "true", children: _jsx(BrandIcon, { cli: cli, size: 20 }) }), _jsxs("div", { className: "cwn-accounts-row-text", children: [_jsx("strong", { children: only?.providerLabel ?? name }), _jsx("span", { children: meta })] }), _jsx("span", { className: "cwn-accounts-state", children: t('已登录') })] }) }) }), _jsx("div", { className: "cwn-accounts-actions", children: onSwitch ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", size: "md", onClick: onClose, children: t('关闭') }), _jsx(Button, { variant: "primary", size: "md", onClick: onSwitch, children: t('切换账号') })] })) : (_jsx(Button, { variant: "primary", size: "md", onClick: onClose, children: t('关闭') })) })] }));
}
export function Waiting({ text }) {
    return (_jsxs("div", { className: "cwn-login-waiting", role: "status", children: [_jsx(StateDot, { state: "ongoing", size: 14 }), text] }));
}
function LinkActions({ link, onOpen }) {
    const [copied, setCopied] = useState(false);
    if (!link)
        return null;
    return (_jsxs("div", { className: "cwn-login-actions", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => onOpen(link), children: t('重新打开登录页面') }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void writeClipboard(link).then((ok) => setCopied(!!ok), () => setCopied(false)), children: copied ? t('已复制链接') : t('复制登录链接') })] }));
}
/** Antigravity's own terms pages, fixed plugin text rather than CLI output. */
const AGY_TERMS = [
    { label: '服务条款', url: 'https://antigravity.google/terms' },
    { label: '隐私政策', url: 'https://policies.google.com/privacy' },
];
/** A CLI's terms: the user agrees here; sharing data with the CLI's maker stays off unless ticked. */
function TermsAnswer({ text, running, onAgree, onCancel, }) {
    const [share, setShare] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx("p", { children: text }), _jsx("div", { className: "cwn-login-actions", children: AGY_TERMS.map((page) => (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => window.open(page.url, '_blank', 'noopener,noreferrer'), children: t(page.label) }, page.url))) }), _jsxs("label", { className: "cwn-login-check", children: [_jsx("input", { type: "checkbox", checked: share, disabled: !running, onChange: (event) => setShare(event.target.checked) }), _jsx("span", { children: t('允许 Google 收集我的交互数据，用于改进 Antigravity CLI（之后可在 Antigravity 设置中关闭）') })] }), _jsxs("div", { className: "cwn-login-actions", children: [_jsx(Button, { variant: "primary", size: "md", disabled: !running, onClick: () => onAgree(share), children: t('同意并继续') }), _jsx(Button, { variant: "ghost", size: "md", onClick: onCancel, children: t('取消') })] })] }));
}
const ANSWER_COPY = {
    code: { label: '授权码', placeholder: '在这里粘贴授权码（⌘V / Ctrl+V）', pasted: '授权码已粘贴。', typed: '已输入授权码。' },
    // Grok asks for the address the browser landed on when its callback cannot reach the CLI.
    callback: { label: '回调网址', placeholder: '在这里粘贴浏览器最后跳转的完整网址（⌘V / Ctrl+V）', pasted: '网址已粘贴。', typed: '已输入网址。' },
    secret: { label: 'API 密钥', placeholder: '在这里粘贴 API Key（⌘V / Ctrl+V）', pasted: 'API Key 已粘贴。', typed: '已输入 API Key。' },
};
/** One pasted value: an authorization code or callback address (shown), or a key (masked, cleared on submit). */
function AnswerForm({ kind, running, retry, onSubmit, onRestart, }) {
    const [value, setValue] = useState('');
    const [pasted, setPasted] = useState(false);
    useEffect(() => {
        if (!retry)
            return;
        setValue('');
        setPasted(false);
    }, [retry]);
    const content = value.replace(/[\r\n]/g, '').trim();
    const copy = ANSWER_COPY[kind];
    const label = t(copy.label);
    return (_jsxs("form", { className: "cwn-login-code", onSubmit: (event) => {
            event.preventDefault();
            if (!content || !running)
                return;
            onSubmit(content);
            if (kind === 'secret')
                setValue('');
        }, children: [_jsx(Input, { autoFocus: true, type: kind === 'secret' ? 'password' : 'text', value: value, maxLength: MAX_ANSWER_LENGTH, spellCheck: false, autoComplete: "off", "aria-label": label, placeholder: t(copy.placeholder), disabled: !running, onPaste: () => setPasted(true), onChange: (event) => {
                    setValue(event.target.value);
                    if (!event.target.value)
                        setPasted(false);
                } }), content ? (_jsxs("p", { className: "cwn-login-callout", "data-tone": "success", role: "status", children: [_jsx(IconCheckCircleFillRegular, { size: 16 }), _jsxs("span", { children: [t(pasted ? copy.pasted : copy.typed), _jsx("strong", { children: t('按回车键完成登录') })] })] })) : (_jsx("p", { className: "cwn-login-hint", children: t('粘贴后按回车键，或点击「完成登录」。') })), _jsxs("div", { className: "cwn-login-actions", children: [_jsx(Button, { type: "submit", variant: "primary", size: "md", disabled: !running || !content, children: t('完成登录') }), retry && (_jsx(Button, { type: "button", variant: "outline", size: "md", onClick: onRestart, children: t('重新开始登录') }))] })] }));
}
function DeviceCode({ code, link, onOpen }) {
    const [copied, setCopied] = useState(false);
    return (_jsxs(_Fragment, { children: [code && (_jsxs("div", { className: "cwn-login-device", children: [_jsx("code", { "aria-label": t('验证码'), children: code }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => void writeClipboard(code).then((ok) => setCopied(!!ok), () => setCopied(false)), children: copied ? t('已复制') : t('复制验证码') })] })), link && (_jsx("div", { className: "cwn-login-actions", children: _jsx(Button, { variant: "primary", size: "md", onClick: () => onOpen(link), children: t('打开验证页面') }) })), _jsx(Waiting, { text: t('等待你在浏览器中确认…') })] }));
}
/**
 * A sign-in or sign-out window drawn by the plugin from Host-authored steps.
 * The native terminal runs behind it; every key it receives answers a choice made here.
 */
export function LoginWindow({ cli, action, phase, guide, rawVisible, notice, header, onToggleRaw, onRespond, onRestart, onDone, onSwitchAccount, account, }) {
    useT();
    const [submitted, setSubmitted] = useState(false);
    const lastStep = useRef();
    const step = guide?.step;
    useEffect(() => {
        // A new step from the Host takes the place of the pending answer.
        if (step !== lastStep.current)
            setSubmitted(false);
        lastStep.current = step;
    }, [step, guide]);
    const running = phase === 'running';
    const ended = phase === 'failed' || phase === 'closed';
    const name = CLI_LABELS[cli];
    const link = loginLink(cli, guide?.link);
    const open = (url) => {
        const safe = loginLink(cli, url);
        // Harness routes HTTP(S) new-window requests to the native browser.
        if (safe)
            window.open(safe, '_blank', 'noopener,noreferrer');
    };
    const respond = (response) => {
        if (!running)
            return;
        if (!('option' in response))
            setSubmitted(true);
        onRespond(response);
    };
    const foot = (_jsxs("div", { className: "cwn-login-foot", children: [_jsx("span", { className: "cwn-login-notice", role: "status", children: guide?.template === 'result' ? undefined : notice }), _jsx(Button, { variant: "ghost", size: "sm", onClick: onToggleRaw, children: rawVisible ? t('隐藏原生终端') : t('显示原生终端') })] }));
    const frame = (body) => (_jsxs("div", { className: "cwn-login-window", children: [header, body, foot] }));
    // Nothing runs yet: the current account as a card, like the 「账号」 window.
    if (step === 'alreadySignedIn')
        return _jsx(CurrentAccount, { cli: cli, account: account, onSwitch: onSwitchAccount, onClose: onDone });
    if (guide?.template === 'result') {
        const detail = step === 'signedIn'
            ? t('现在可以派遣 {cli} 任务了。', { cli: name })
            : step === 'loggedOut'
                ? t('需要时可在设置中重新登录。')
                : undefined;
        const buttons = guide.tone === 'warning' ? (_jsx(Button, { variant: "outline", size: "md", onClick: onRestart, children: t('重试') })) : (_jsx(Button, { variant: "primary", size: "md", onClick: onDone, children: t('完成') }));
        return frame(_jsx(Result, { tone: guide.tone, title: hostText(guide.text), detail: detail, children: buttons }));
    }
    const body = (template = guide?.template) => {
        if (!guide || template === 'starting')
            return ended ? null : _jsx(Waiting, { text: guide ? hostText(guide.text) : t('正在启动 {cli}…', { cli: name }) });
        if (submitted && template !== 'choice' && template !== 'trust' && template !== 'terms')
            return _jsx(Waiting, { text: t('正在确认登录…') });
        switch (template) {
            case 'trust':
                return (_jsxs(_Fragment, { children: [_jsx("p", { children: hostText(guide.text) }), _jsxs("div", { className: "cwn-login-actions", children: [_jsx(Button, { variant: "primary", size: "md", disabled: !running, onClick: () => respond({ confirm: 'trust' }), children: t('信任并继续') }), _jsx(Button, { variant: "ghost", size: "md", onClick: onDone, children: t('取消') })] })] }));
            case 'terms':
                return (_jsx(TermsAnswer, { text: hostText(guide.text), running: running, onAgree: (share) => respond({ agree: 'terms', share }), onCancel: onDone }));
            case 'choice':
                return (_jsxs(_Fragment, { children: [_jsx("p", { children: hostText(guide.text) }), _jsx("div", { className: "cwn-login-actions", children: guide.options?.map((option, index) => (_jsx(Button, { variant: index === 0 ? 'primary' : 'outline', size: "md", disabled: !running, onClick: () => respond({ option: option.id }), children: hostText(option.label) }, option.id))) }), guide.options?.map((option) => option.detail && (_jsx("p", { className: "cwn-login-hint", children: hostText(option.detail) }, option.id)))] }));
            case 'browser':
                return (_jsxs(_Fragment, { children: [_jsx("p", { children: hostText(guide.text) }), _jsx(LinkActions, { link: link, onOpen: open }), _jsx(Waiting, { text: t('等待浏览器完成授权…') })] }));
            case 'deviceCode':
                return (_jsxs(_Fragment, { children: [_jsx("p", { children: hostText(guide.text) }), _jsx(DeviceCode, { code: guide.code, link: link, onOpen: open })] }));
            case 'secret':
            case 'browserCode':
                return (_jsxs(_Fragment, { children: [guide.tone === 'warning' ? (_jsx("p", { className: "cwn-login-callout", "data-tone": "warning", role: "alert", children: hostText(guide.text) })) : (template === 'secret' && _jsx("p", { children: hostText(guide.text) })), _jsx(AnswerForm, { kind: template === 'secret' ? 'secret' : guide.step === 'callback' ? 'callback' : 'code', running: running, retry: guide.tone === 'warning', onSubmit: (value) => respond(template === 'secret' ? { secret: value } : { code: value }), onRestart: onRestart })] }));
            case 'native':
                return (_jsxs(_Fragment, { children: [_jsx("p", { className: "cwn-login-callout", "data-tone": "warning", role: "status", children: hostText(guide.text) }), action === 'logout' && !rawVisible && (_jsx("p", { className: "cwn-login-hint", children: t('请点击「显示原生终端」，在 CLI 原生菜单中继续退出。') }))] }));
            default:
                return _jsx(Waiting, { text: hostText(guide.text) });
        }
    };
    const plan = action === 'login' ? guide?.plan : undefined;
    const stage = guide?.stage ?? 0;
    let content;
    if (plan?.length) {
        // A pasted code belongs to the step after the browser one when the plan has it.
        const split = guide?.template === 'browserCode' && stage + 1 < plan.length;
        const confirming = submitted || guide?.template === 'waiting';
        content = (_jsx("ol", { className: "cwn-login-steps", children: plan.map((title, index) => {
                const active = index === stage || (split && index === stage + 1);
                const state = index < stage || (split && confirming && index === stage) ? 'done' : active ? 'active' : 'pending';
                let children = null;
                if (state === 'active')
                    children =
                        split && index === stage ? (_jsxs(_Fragment, { children: [_jsx("p", { children: guide.tone === 'warning' ? t('请重新在浏览器中授权，复制新的授权码。') : hostText(guide.text) }), _jsx(LinkActions, { link: link, onOpen: open })] })) : (body());
                return (_jsx(Step, { index: index + 1, state: state, title: hostText(title), children: children }, title));
            }) }));
    }
    else
        content = body();
    return frame(_jsxs(_Fragment, { children: [content, ended && (_jsxs("p", { className: "cwn-login-callout", "data-tone": "warning", role: "alert", children: [action === 'logout' ? t('原生终端已关闭，请重试。') : t('登录窗口已结束。'), _jsx(Button, { variant: "ghost", size: "sm", onClick: onRestart, children: action === 'logout' ? t('重试') : t('重新开始登录') })] }))] }));
}
//# sourceMappingURL=login-window.js.map