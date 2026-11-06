import type { AccountAction, AccountResponse } from '../shared/accounts.ts';
import { type AccountChange, type AccountEvidence, type AccountGuideDriver, type GuideEvent } from './account-guide/engine.ts';
export declare const AGY_GUIDES: {
    readonly trust: {
        readonly stage: 0;
        readonly text: "Antigravity 首次在此项目文件夹运行，需要你确认是否信任该文件夹。";
        readonly plan: string[];
        readonly step: "trust";
        readonly tone: "action";
        readonly template: "trust";
    };
    readonly setup: {
        readonly stage: 0;
        readonly text: "Antigravity 首次运行，需要你在下方原生终端中完成剩余的初始设置。用方向键选择、回车确认，完成后插件会继续。";
        readonly plan: string[];
        readonly step: "setup";
        readonly tone: "action";
        readonly template: "native";
    };
    readonly preparing: {
        readonly step: "preparing";
        readonly tone: "info";
        readonly template: "waiting";
        readonly text: "正在完成 Antigravity 首次运行设置…";
    };
    readonly terms: {
        readonly step: "terms";
        readonly tone: "action";
        readonly template: "terms";
        readonly text: "Antigravity 首次运行，需要同意 Google Antigravity CLI 服务条款和 Google 隐私政策后才能继续。AI 编程智能体存在自主执行代码、数据外泄、提示注入和供应链等安全风险，请留意并核实它的每项操作。";
    };
    readonly method: {
        readonly stage: 0;
        readonly text: "使用 Google 账号登录 Antigravity。";
        readonly options: [{
            readonly id: "google";
            readonly label: "使用 Google 账号登录";
            readonly detail: "如需使用 Google Cloud 项目登录，请打开原生终端操作。";
        }];
        readonly plan: string[];
        readonly step: "method";
        readonly tone: "action";
        readonly template: "choice";
    };
    readonly code: {
        readonly stage: 1;
        readonly text: "浏览器已打开 Google 登录页面。登录并点击「允许」后，页面会显示一串授权码，把它复制下来。";
        readonly plan: string[];
        readonly step: "code";
        readonly tone: "action";
        readonly template: "browserCode";
    };
    readonly pasted: {
        readonly stage: 1;
        readonly text: "授权码已粘贴，请按回车完成登录。";
        readonly plan: string[];
        readonly step: "pasted";
        readonly tone: "action";
        readonly template: "browserCode";
    };
    readonly confirming: {
        readonly stage: 2;
        readonly text: "正在确认登录…";
        readonly plan: string[];
        readonly step: "confirming";
        readonly tone: "info";
        readonly template: "waiting";
    };
    readonly signedIn: {
        readonly step: "signedIn";
        readonly tone: "success";
        readonly template: "result";
        readonly text: "已登录 Antigravity";
    };
    readonly unconfirmed: {
        readonly stage: 1;
        readonly text: "未能确认登录：授权码可能不完整或已过期。请重新开始登录，或查看原生终端中的提示。";
        readonly plan: string[];
        readonly step: "unconfirmed";
        readonly tone: "warning";
        readonly template: "browserCode";
    };
    readonly alreadySignedIn: {
        readonly step: "alreadySignedIn";
        readonly tone: "info";
        readonly template: "result";
        readonly text: "当前已登录 Antigravity。如需切换账号，请先退出登录。";
    };
    readonly loggingOut: {
        readonly step: "loggingOut";
        readonly tone: "info";
        readonly template: "waiting";
        readonly text: "正在退出 Antigravity…";
    };
    readonly loggedOut: {
        readonly step: "loggedOut";
        readonly tone: "success";
        readonly template: "result";
        readonly text: "已退出 Antigravity";
    };
    readonly notSignedIn: {
        readonly step: "notSignedIn";
        readonly tone: "info";
        readonly template: "result";
        readonly text: "当前未登录 Antigravity，无需退出。";
    };
    readonly logoutUnconfirmed: {
        readonly step: "logoutUnconfirmed";
        readonly tone: "warning";
        readonly template: "result";
        readonly text: "未能确认已退出，请查看原生终端中的提示。";
    };
    readonly menuUnresolved: {
        readonly step: "menuUnresolved";
        readonly tone: "warning";
        readonly template: "result";
        readonly text: "Antigravity 显示了登录菜单，但未能确认当前未登录，插件没有自动退出，也不会在菜单中输入。请点击「显示原生终端」查看当前画面。";
    };
};
export type AgyGuideEvent = GuideEvent;
/** Follows one Antigravity login or logout terminal; never stores what the user types. */
export declare class AgyAccountGuide implements AccountGuideDriver {
    private readonly action;
    readonly size: {
        cols: number;
        rows: number;
    };
    private screen;
    private raw;
    private link?;
    private step?;
    private typed;
    private commandSent;
    private identifying;
    /** A sign-out drew the login menu: the pending native account read decides it. */
    private menuDrawn;
    private afterCommand;
    /** The trust or setup question on screen was answered with Enter; judge what agy draws next. */
    private gateAnswered;
    /** A first-run setup screen was drawn: a quiet screen may still be one of its steps. */
    private firstRun;
    private schemeSkipped;
    /** Whether the data-sharing box on the terms screen is ticked, as agy drew it. */
    private shared?;
    /** The user agreed to the terms; Enter waits until `[Done]` is selected. */
    private toDone;
    constructor(action: AccountAction);
    output(text: string): AgyGuideEvent[];
    /**
     * The screen stopped changing before any known step: ask the Host to read the
     * native account. The main screen's exact text is not relied on alone.
     */
    settled(): AgyGuideEvent[];
    /** agy redrew its login menu after `/logout`: a further Enter would start a sign-in. */
    loginMenuAfterCommand(): boolean;
    /** The native account state read after `settled`. */
    identified(evidence: AccountEvidence | string | undefined): AgyGuideEvent[];
    input(data: string): AgyGuideEvent[];
    /** The login could not be confirmed in time; the user may paste a fresh code. */
    unconfirmed(change?: AccountChange): AgyGuideEvent[];
    /** An answer from the plugin window, turned into the keys agy expects. */
    respond(response: AccountResponse): AgyGuideEvent[];
    exited(): AgyGuideEvent[];
    confirmed(change: AccountChange): AgyGuideEvent[];
    retryEnter(): boolean;
    proves(change: AccountChange, _before: AccountEvidence | undefined, after: AccountEvidence | undefined): boolean;
    /** A step other than an answered trust or setup question is on screen: wait for it. */
    private waiting;
    /**
     * A question on screen, shown before anything is typed. The color scheme is only a
     * look, so its preselected default is taken; terms and folder trust are the user's.
     */
    private gate;
    /** The user agreed to the terms: press Enter once agy shows `[Done]` selected. */
    private done;
    /** agy's setup wizard is drawn: its key hints or buttons. */
    private wizard;
    private order;
    private show;
    private withLink;
    /** Keeps the latest Google sign-in address; true when it changed. */
    private readLink;
}
