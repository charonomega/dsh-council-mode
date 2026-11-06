import { type ReactNode } from 'react';
import type { AccountAction, AccountGuide, AccountResponse, AccountStatus } from '../../shared/accounts.ts';
import { type CliId } from '../../shared/types.ts';
export type LoginPhase = 'loading' | 'running' | 'closed' | 'failed' | 'stopping';
/** The only addresses a window may open: the CLI's own sign-in pages, checked again here. */
export declare function loginLink(cli: CliId, value: string | undefined): string | undefined;
export declare function Waiting({ text }: {
    text: string;
}): import("react/jsx-runtime").JSX.Element;
/**
 * A sign-in or sign-out window drawn by the plugin from Host-authored steps.
 * The native terminal runs behind it; every key it receives answers a choice made here.
 */
export declare function LoginWindow({ cli, action, phase, guide, rawVisible, notice, header, onToggleRaw, onRespond, onRestart, onDone, onSwitchAccount, account, }: {
    cli: CliId;
    action: AccountAction;
    phase: LoginPhase;
    guide?: AccountGuide;
    rawVisible: boolean;
    /** A short terminal status from the Host or the terminal shell, shown beside the toggle. */
    notice?: string;
    /** Shown above the steps, e.g. the provider picker. */
    header?: ReactNode;
    onToggleRaw: () => void;
    onRespond: (response: AccountResponse) => void;
    onRestart: () => void;
    onDone: () => void;
    onSwitchAccount?: () => void;
    /** The account a single-account CLI holds, shown before switching. */
    account?: AccountStatus;
}): import("react/jsx-runtime").JSX.Element;
