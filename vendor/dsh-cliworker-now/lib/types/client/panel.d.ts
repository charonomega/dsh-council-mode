import { type ReactNode } from 'react';
import { type Worker } from '../shared/types.ts';
import { type API } from './workers.ts';
interface PanelProps {
    sessionId: string;
    api: API;
    openNativeSettings?: () => void;
    renderHarnessConversation?: (worker: Worker) => ReactNode;
    activeHarnessSessionId?: string;
}
export declare function Panel(props: PanelProps): import("react/jsx-runtime").JSX.Element;
export {};
