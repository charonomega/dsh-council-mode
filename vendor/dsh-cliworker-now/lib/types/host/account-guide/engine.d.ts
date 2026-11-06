import type { AccountAction, AccountGuide, AccountLoginMode, AccountResponse, AccountStatus } from '../../shared/accounts.ts';
/** What a guide asks the account manager to do. Keys only ever answer a user's choice. */
export type GuideEvent = {
    guide: AccountGuide;
}
/** Keys for the user's answer; `enter` presses Enter after a short pause. */
 | {
    write: string;
    enter?: boolean;
}
/** An automatic sign-out command the user asked for by clicking「退出」. */
 | {
    command: string;
} | {
    confirm: 'login' | 'logout';
}
/** Read the native account in the background while the user authorizes elsewhere. */
 | {
    watch: 'login';
} | {
    identify: true;
} | {
    finish: true;
};
export type AccountChange = 'login' | 'logout';
/** The native account state a guide judges, never terminal text. */
export type AccountEvidence = Pick<AccountStatus, 'state'> & Partial<Pick<AccountStatus, 'logins' | 'accountLabel'>>;
/** The account manager's view of one guided terminal. */
export interface AccountGuideDriver {
    readonly size: {
        cols: number;
        rows: number;
    };
    output(text: string): GuideEvent[];
    resize?(cols: number, rows: number): void;
    /** Raw keys typed in the visible native terminal. */
    input(data: string): GuideEvent[];
    /** An answer from the plugin window; throws when the current step does not take it. */
    respond(response: AccountResponse): GuideEvent[];
    settled(): GuideEvent[];
    identified(state: AccountEvidence | undefined): GuideEvent[];
    /** The native process ended by itself. */
    exited(code: number | undefined): GuideEvent[];
    confirmed(change: AccountChange): GuideEvent[];
    unconfirmed(change: AccountChange): GuideEvent[];
    /** After an automatic command, whether one more Enter cannot start something else. */
    retryEnter(): boolean;
    proves(change: AccountChange, before: AccountEvidence | undefined, after: AccountEvidence | undefined, exitCode?: number): boolean;
}
export declare class GuideResponseError extends Error {
    constructor();
}
export declare const CONTROL: RegExp;
export declare const compact: (text: string) => string;
export interface ScreenView {
    /** Every marker, compared without whitespace or case, is on the recent screen. */
    has(...markers: string[]): boolean;
    /** Visible screen text after cursor movement and erasure. */
    readonly plain: string;
    readonly link?: string;
    readonly code?: string;
}
export interface FlowContext {
    action: AccountAction;
    provider?: string;
    mode?: AccountLoginMode;
    /** The one login (`AccountLogin.id`) this sign-out removes. */
    login?: string;
    /** The provider a login is stored under when the CLI files it elsewhere (OMP's device login). */
    stores?: string;
    bracketedPaste: boolean;
}
export interface FlowAnswer {
    keys: string;
    enter?: boolean;
    /** The answer submits the sign-in; start reading the native account. */
    confirm?: AccountChange;
    /** The answer leaves this screen (e.g. folder trust); judge only what the CLI draws next. */
    resets?: boolean;
}
export interface FlowStep {
    id: string;
    when: readonly string[] | ((screen: ScreenView, ctx: FlowContext) => boolean);
    guide: (screen: ScreenView, ctx: FlowContext) => AccountGuide;
    respond?: (response: AccountResponse, ctx: FlowContext) => FlowAnswer | undefined;
    /** Keys written once when the step shows, for a choice the user already made in the window. */
    auto?: (screen: ScreenView, ctx: FlowContext) => string | undefined;
    /** Reaching this step is itself a sign that the change may have taken effect. */
    confirms?: AccountChange;
    /**
     * The CLI waits for a browser or device authorization and keeps running after it:
     * read the account in the background until it signs in, while the step still takes answers.
     */
    watches?: 'login';
    /** Enter typed in the visible terminal after content submits this step. */
    typedConfirms?: AccountChange;
    /** The step is a final answer of the CLI (e.g. nothing to sign out); the window closes. */
    ends?: boolean;
    /**
     * A native list in which the plugin finds the entry the user chose in the window.
     * Reads lines drawn since the last key; returns the highlighted row's own key and
     * whether it is that entry. Enter is pressed only on a match, the down arrow otherwise;
     * a highlighted row seen twice means the entry is not listed and the user takes over.
     */
    pick?: (lines: string[], ctx: FlowContext) => {
        row: string;
        target: boolean;
    } | undefined;
    /** What Enter on the picked row changes; logout by default. */
    pickConfirms?: AccountChange;
}
export interface FlowDefinition {
    /** CLI name used in plugin texts. */
    name: string;
    size?: {
        cols: number;
        rows: number;
    };
    links?: readonly string[];
    /** Device code on the plain screen; group 1 is the code. */
    deviceCode?: RegExp;
    /** `plan` titles the whole sign-in; the confirmation is its last step. */
    login?: {
        steps: FlowStep[];
        plan?: readonly string[];
    };
    logout?: {
        steps?: FlowStep[];
        /**
         * A TUI command typed once its ready screen shows, or once the screen settles on a
         * signed-in account; `signedOut` proves nothing to do, `menu` that Enter is unsafe again.
         */
        command?: {
            ready?: readonly string[];
            text: string;
            signedOut?: readonly string[];
            menu?: readonly string[];
        };
    };
    proves?: FlowGuide['proves'];
    /** Logins carry `cli:provider[:entry]` ids: a provider login is proven by that provider's own entry. */
    targets?: boolean;
}
export declare const GUIDE_SIZE: {
    cols: number;
    rows: number;
};
/** Plugin texts shared by every CLI; a flow only adds its own steps. */
export declare function guideTexts(name: string): {
    readonly starting: {
        readonly step: "starting";
        readonly tone: "info";
        readonly template: "starting";
        readonly text: `\u6B63\u5728\u542F\u52A8 ${string}\u2026`;
    };
    readonly confirming: {
        readonly step: "confirming";
        readonly tone: "info";
        readonly template: "waiting";
        readonly text: "正在确认登录…";
    };
    readonly signedIn: {
        readonly step: "signedIn";
        readonly tone: "success";
        readonly template: "result";
        readonly text: `\u5DF2\u767B\u5F55 ${string}`;
    };
    readonly unconfirmed: {
        readonly step: "unconfirmed";
        readonly tone: "warning";
        readonly template: "result";
        readonly text: "未能确认登录。请重新开始登录，或查看原生终端中的提示。";
    };
    readonly loggingOut: {
        readonly step: "loggingOut";
        readonly tone: "info";
        readonly template: "waiting";
        readonly text: `\u6B63\u5728\u9000\u51FA ${string}\u2026`;
    };
    readonly loggedOut: {
        readonly step: "loggedOut";
        readonly tone: "success";
        readonly template: "result";
        readonly text: `\u5DF2\u9000\u51FA ${string}`;
    };
    readonly notSignedIn: {
        readonly step: "notSignedIn";
        readonly tone: "info";
        readonly template: "result";
        readonly text: `\u5F53\u524D\u672A\u767B\u5F55 ${string}\uFF0C\u65E0\u9700\u9000\u51FA\u3002`;
    };
    readonly logoutUnconfirmed: {
        readonly step: "logoutUnconfirmed";
        readonly tone: "warning";
        readonly template: "result";
        readonly text: "未能确认已退出，请查看原生终端中的提示。";
    };
    readonly native: {
        readonly step: "native";
        readonly tone: "warning";
        readonly template: "native";
        readonly text: "无法识别当前步骤，请在原生终端中继续。";
    };
};
/** A guide driven by one CLI's flow definition. It never stores what the user types. */
export declare class FlowGuide implements AccountGuideDriver {
    private readonly flow;
    private readonly ctx;
    readonly size: {
        cols: number;
        rows: number;
    };
    private readonly texts;
    private readonly steps;
    private screen;
    private plain;
    private readonly terminal;
    private link?;
    private code?;
    private index;
    private shown?;
    private autoDone;
    private typed;
    private commandSent;
    private afterCommand;
    private identifying;
    private confirming;
    private done;
    private bracketed;
    private picked;
    private lastPicked?;
    private pickDone;
    private watching;
    constructor(flow: FlowDefinition, ctx: Omit<FlowContext, 'bracketedPaste'>);
    private get context();
    private view;
    output(text: string): GuideEvent[];
    resize(cols: number, rows: number): void;
    private advance;
    /** One key per drawn screen: Enter on the chosen row, the down arrow on any other. */
    private pick;
    input(data: string): GuideEvent[];
    respond(response: AccountResponse): GuideEvent[];
    /** The user's own answer as keys: bracketed when the CLI asked for it, as typed otherwise. */
    static paste(value: string, ctx: FlowContext): string;
    settled(): GuideEvent[];
    identified(state: AccountEvidence | undefined): GuideEvent[];
    exited(): GuideEvent[];
    confirmed(change: AccountChange): GuideEvent[];
    unconfirmed(change: AccountChange): GuideEvent[];
    retryEnter(): boolean;
    proves(change: AccountChange, before: AccountEvidence | undefined, after: AccountEvidence | undefined, exitCode?: number): boolean;
    private startConfirm;
    private sendCommand;
    private end;
    private show;
    private readLinks;
}
