import { type MutableRefObject } from 'react';
import type { AccountAction, AccountSource, AccountStatus, ZCodeLoginProvider } from '../shared/accounts.ts';
import { type CliId } from '../shared/types.ts';
import { type API } from './workers.ts';
export type AccountCloseControl = MutableRefObject<(() => Promise<boolean>) | undefined>;
/** Only mounted after a human selects an account action. No prompt is auto-entered. */
export declare function AccountTerminal({ api, sessionId, cli, action: requested, source, provider: requestedProvider, login: requestedLogin, replaces, signedIn, account, onClose, onFinished, closeControl, }: {
    api: API;
    sessionId: string;
    cli: CliId;
    action: AccountAction;
    source?: AccountSource;
    /** ZCode BigModel / Z.AI, or a provider of the account window's 「登录到」. */
    provider?: ZCodeLoginProvider | string;
    /** One login (`AccountLogin.id`) of the account window to sign out. */
    login?: string;
    /** After this sign-in is confirmed, sign this login out: Hermes 「替换」. */
    replaces?: string;
    /** The CLI already holds an account; a single-account login first offers to switch. */
    signedIn?: boolean;
    /** The signed-in account the switch page shows. */
    account?: AccountStatus;
    onClose: () => void;
    onFinished: () => void;
    closeControl?: AccountCloseControl;
}): import("react/jsx-runtime").JSX.Element;
