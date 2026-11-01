import { type MutableRefObject } from 'react';
import type { AccountAction, AccountSource, ZCodeLoginProvider } from '../shared/accounts.ts';
import { type CliId } from '../shared/types.ts';
import { type API } from './workers.ts';
export type AccountCloseControl = MutableRefObject<(() => Promise<boolean>) | undefined>;
/** Only mounted after a human selects an account action. No prompt is auto-entered. */
export declare function AccountTerminal({ api, sessionId, cli, action, source, provider, onClose, onFinished, closeControl, }: {
    api: API;
    sessionId: string;
    cli: CliId;
    action: AccountAction;
    source?: AccountSource;
    provider?: ZCodeLoginProvider;
    onClose: () => void;
    onFinished: () => void;
    closeControl?: AccountCloseControl;
}): import("react/jsx-runtime").JSX.Element;
