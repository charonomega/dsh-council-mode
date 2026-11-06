import { type ReactNode } from 'react';
import { type Worker, type DshSubagent } from '../shared/types.ts';
import { type API } from './workers.ts';
interface PanelProps {
    visible?: boolean;
    sessionId: string;
    api: API;
    openNativeSettings?: () => void;
    renderDshConversation?: (child: DshSubagent) => ReactNode;
    renderHarnessConversation?: (worker: Worker) => ReactNode;
    /** Background holder for running Workers' native sessions (approval panels). */
    renderSessionRetention?: (workers: readonly Worker[]) => ReactNode;
    activeHarnessSessionId?: string;
}
export declare function Panel(props: PanelProps): import("react/jsx-runtime").JSX.Element;
export {};
