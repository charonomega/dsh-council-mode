import type { AccountStatus } from '../../shared/accounts.ts';
import { type CliId } from '../../shared/types.ts';
import { type AccountCloseControl } from '../account-terminal.tsx';
import type { API } from '../workers.ts';
/**
 * The 「账号」 window of a CLI that keeps several logins (2026-10-26 decision):
 * every login with its own 退出, and 添加账号 with a 「登录到」 provider picker.
 */
export declare function AccountsWindow({ api, sessionId, cli, status, closeControl, onRefresh, onClose, }: {
    api: API;
    sessionId: string;
    cli: CliId;
    status?: AccountStatus;
    closeControl: AccountCloseControl;
    onRefresh: () => void;
    onClose: () => void;
}): import("react/jsx-runtime").JSX.Element;
