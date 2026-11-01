import type { CliId } from '../shared/types.ts';
import { type API } from './workers.ts';
/** Keyed by project session and CLI in the parent: late reads/writes cannot cross settings pages. */
export declare function RunningMessageChoice({ api, sessionId, cli, expanded, blocked, onBusyChange, }: {
    api: API;
    sessionId: string;
    cli: CliId;
    expanded: boolean;
    blocked: boolean;
    onBusyChange: (busy: boolean) => void;
}): import("react/jsx-runtime").JSX.Element;
