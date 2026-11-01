import { type CliId } from '../shared/types.ts';
import { type API } from './workers.ts';
interface SettingsDialogProps {
    open: boolean;
    onClose: () => void;
    api: API;
    sessionId: string;
    initialCli: CliId;
    openNativeSettings?: () => void;
}
/** Native modal owns focus, dismissal, theme, elevation and entrance animation. */
export declare function SettingsDialog(props: SettingsDialogProps): import("react/jsx-runtime").JSX.Element | null;
export {};
