import { type API } from './workers.ts';
/** Profile-wide plugin settings; each section owns its own save feedback. */
export declare function GeneralSettingsPane({ api, sessionId }: {
    api: API;
    sessionId: string;
}): import("react/jsx-runtime").JSX.Element;
