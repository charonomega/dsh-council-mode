import { type CliId } from '../shared/types.ts';
import { type API } from './workers.ts';
/** Path management remains usable for a disabled CLI and never saves model defaults. */
export declare function CliExecutableSettings({ api, sessionId, cli, blocked, accountLoading, accountRevision, onApplied, onBusyChange, }: {
    api: API;
    sessionId: string;
    cli: CliId;
    blocked: boolean;
    accountLoading: boolean;
    accountRevision: unknown;
    onApplied: () => void;
    onBusyChange: (busy: boolean) => void;
}): import("react/jsx-runtime").JSX.Element;
