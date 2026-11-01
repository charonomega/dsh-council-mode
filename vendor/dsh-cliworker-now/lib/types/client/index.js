import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Button, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import remoteContribution from 'dsh-cliworker-now/remote';
import { active } from "../shared/types.js";
import { Panel } from "./panel.js";
import { NativePresentationProvider } from "./native-presentation.js";
import { HarnessConversation, readHarnessConversationBinding } from "./harness-conversation.js";
import { HarnessBindingRegistry } from "./harness-binding-registry.js";
import { HarnessNativeSessionSupports } from "./harness-native-session-support.js";
import { installHarnessControlGuards } from "./harness-control-guards.js";
import { installHarnessNativeContent } from "./harness-native-content.js";
import { installHarnessNativeCommandMenu } from "./harness-native-command-menu.js";
import { installHarnessReasoningRecords, reasoningRecordsStyles } from "./harness-reasoning-records.js";
import { installHarnessNativeTelemetry } from "./harness-native-telemetry.js";
import { HARNESS_COMMAND_SOURCE, installHarnessNativeCommands } from "./harness-native-commands.js";
import { installHarnessWorkerGoal, workerGoalStyles } from "./harness-worker-goal.js";
import { HarnessWorkerFork, HarnessForkNotice, installHarnessForkMenu, installHarnessForkRouting } from "./harness-worker-fork.js";
import { installHarnessNativeAttachments } from "./harness-native-attachments.js";
import { useWorkers } from "./workers.js";
import { styles, nativeChatStyles, modelPickerStyles, telemetryStyles, processStyles, contextInspectionStyles, nativeInteractionStyles, hoverFeedbackStyles, conversationInteractionStyles, settingsStyles, rolePresetStyles, } from "./styles.js";
import { BrandIcon } from "./icons.js";
import { installNativeJobOverlay } from "./native-job-overlay.js";
import { workerManagementStyles } from "./management-styles.js";
import { renameCopyStyles } from "./rename-copy-styles.js";
const ID = 'dsh-cliworker-now';
export const inject = [
    'slots',
    'sidebarRightTabs',
    'sidebarRight',
    'remote',
    'configForms',
    'sessions',
    'conversation',
    'uiConversation',
    'uiSession',
];
export function apply(ctx) {
    ctx.effect(() => ctx.remote.$mount(remoteContribution), 'cliworker:remote');
    ctx.inject(['remote.cliworker'], (scope) => {
        const remote = scope.remote, worker = remote.cliworker;
        const api = { $stream: (options) => remote.$stream(options), cliworker: worker };
        const nativeChatSettings = scope.configForms.get('ui-chat');
        const harnessServices = { sessions: scope.sessions };
        const bindings = new HarnessBindingRegistry();
        scope.effect(() => () => bindings.clear());
        scope.effect(() => installHarnessControlGuards(scope, bindings, api));
        scope.effect(() => installHarnessWorkerGoal(scope, bindings, api));
        const features = {};
        let forks;
        const forkListeners = new Set();
        const subscribeForks = (listener) => { forkListeners.add(listener); return () => { forkListeners.delete(listener); }; };
        const getForks = () => forks;
        // feedbackUi is provided by Harness ui-message-feedback. Read it only in
        // its injected Cordis scope; the command source keeps the live callback.
        scope.inject(['feedbackUi'], (feedback) => {
            const ui = feedback.feedbackUi;
            feedback.effect(() => {
                const open = (sessionId) => ui.openSession(sessionId);
                features.openFeedback = open;
                return () => { if (features.openFeedback === open)
                    delete features.openFeedback; };
            });
        });
        scope.inject(['uiWorkspace'], (navigation) => {
            navigation.effect(() => {
                const services = { sessions: navigation.sessions, uiConversation: navigation.uiConversation, uiWorkspace: navigation.uiWorkspace };
                const controller = new HarnessWorkerFork(services, bindings, api);
                forks = controller;
                forkListeners.forEach((listener) => listener());
                features.fork = (sessionId) => { void controller.fork(sessionId); };
                features.forkReason = (sessionId) => controller.reason(sessionId);
                const releaseRouting = installHarnessForkRouting(services, controller);
                const releaseMenu = installHarnessForkMenu(navigation, bindings, controller);
                return () => {
                    releaseMenu();
                    releaseRouting();
                    controller.dispose();
                    if (forks === controller) {
                        forks = undefined;
                        delete features.fork;
                        delete features.forkReason;
                        forkListeners.forEach((listener) => listener());
                    }
                };
            });
        });
        scope.effect(() => installHarnessReasoningRecords(scope, bindings));
        const nativeTelemetry = installHarnessNativeTelemetry(scope, bindings, api);
        scope.effect(() => () => nativeTelemetry.dispose());
        scope.inject(['inputTriggers', 'commandUi'], (commands) => {
            commands.effect(() => {
                const attachments = installHarnessNativeAttachments({ sessions: scope.sessions, conversation: scope.conversation, inputTriggers: commands.inputTriggers }, bindings);
                const dispose = installHarnessNativeCommands(commands, bindings, api, attachments, features);
                const disposeMenu = installHarnessNativeCommandMenu(commands, bindings);
                return () => { disposeMenu(); dispose(); attachments.dispose(); };
            });
        });
        function WorkerPanel(props) {
            const address = props.useSession((session) => session.subagent?.address);
            const parentSessionId = address?.parentSessionId ?? props.sessionId;
            return (_jsx(NativePresentationProvider, { source: nativeChatSettings, children: _jsx(Panel, { ...props, sessionId: parentSessionId, activeHarnessSessionId: address?.childSessionId, renderHarnessConversation: (worker) => (_jsx(HarnessConversation, { services: harnessServices, bindings: bindings, attachProjections: nativeTelemetry.attach, api: api, parentSessionId: parentSessionId, worker: worker, renderConversation: (reference) => (_jsx(props.SessionProvider, { session: reference, children: props.renderSlot('cliworker.native.sidebar', { composerPresentation: 'main', commandSource: HARNESS_COMMAND_SOURCE,
                                childImageUploads: worker.harnessConversation?.capabilities.attachments === true }) })) }, worker.id)) }) }));
        }
        let nativeSettingsOpen;
        function NativeSettingsBridge({ open }) {
            useEffect(() => {
                nativeSettingsOpen = open;
                return () => {
                    if (nativeSettingsOpen === open)
                        nativeSettingsOpen = undefined;
                };
            }, [open]);
            return null;
        }
        scope.effect(() => scope.slots.inject('settings.section', () => scope.slots.inject('shell.overlay', () => {
            // Harness 0.2.0-rc.2 compatibility: share the shell's existing root
            // handle. The renderer owns instance creation, binding and disposal;
            // we neither create its store nor redeclare its settings slots.
            // Use SlotCore's dynamic inspection signature; sidebar.settings is
            // owned by an optional native package, not declared by this plugin.
            const ledger = scope.slots;
            const handle = ledger.entriesOfSlot('sidebar.settings')[0]?.store;
            if (!handle ||
                typeof handle === 'function' ||
                typeof handle.spec?.actions?.openSection !== 'function')
                return () => { };
            const dispose = scope.slots.register({
                name: 'shell.overlay',
                id: `${ID}.native-settings`,
                store: handle,
                inject: (actions) => ({
                    open: typeof actions.openSection === 'function' ? () => actions.openSection('models') : undefined,
                }),
            }, NativeSettingsBridge);
            return () => {
                nativeSettingsOpen = undefined;
                dispose();
            };
        })));
        scope.effect(() => {
            const style = document.createElement('style');
            style.textContent =
                styles +
                    nativeChatStyles +
                    modelPickerStyles +
                    telemetryStyles +
                    nativeInteractionStyles +
                    hoverFeedbackStyles +
                    conversationInteractionStyles +
                    settingsStyles +
                    rolePresetStyles +
                    workerManagementStyles +
                    renameCopyStyles +
                    processStyles +
                    contextInspectionStyles +
                    reasoningRecordsStyles + workerGoalStyles;
            document.head.append(style);
            return () => style.remove();
        });
        scope.effect(() => installNativeJobOverlay(document));
        scope.effect(() => scope.sidebarRightTabs.register({
            id: ID,
            kind: 'cliworker',
            title: () => 'CLI Worker',
            guide: [
                {
                    id: 'cliworker',
                    order: 25,
                    title: () => 'CLI Worker',
                    description: () => '查看各 CLI 子 Agent 的实时工作',
                    icon: () => _jsx(BrandIcon, {}),
                },
            ],
        }));
        scope.effect(() => scope.slots.inject('sidebar.right.pane.tab', () => scope.slots.register({
            name: 'sidebar.right.pane.tab',
            key: ID,
            children: { 'cliworker.native.sidebar': { kind: 'single', scope: 'session' } },
            inject: () => ({
                api,
                openNativeSettings: () => {
                    if (!nativeSettingsOpen)
                        throw new Error('Harness 原生设置入口暂不可用');
                    nativeSettingsOpen();
                },
            }),
        }, WorkerPanel)));
        scope.effect(() => installHarnessNativeContent(scope));
        function Header({ sessionId, useSession }) {
            const workerForks = useSyncExternalStore(subscribeForks, getForks);
            const address = useSession((session) => session.subagent?.address);
            const parentSessionId = address?.parentSessionId ?? sessionId;
            const { snapshot, connecting } = useWorkers(api, parentSessionId);
            useLayoutEffect(() => {
                if (connecting)
                    return;
                for (const worker of snapshot.workers) {
                    if (worker.parentSessionId !== parentSessionId || !worker.harnessConversation)
                        continue;
                    try {
                        bindings.publish(readHarnessConversationBinding(worker.harnessConversation, parentSessionId), worker);
                    }
                    catch {
                        /* Invalid Host identity never scopes native controls. */
                    }
                }
            }, [snapshot, connecting, parentSessionId]);
            const seen = useRef(new Set());
            useEffect(() => {
                seen.current.clear();
            }, [parentSessionId]);
            const open = () => {
                if (scope.sidebarRight.mounted.getSnapshot() === sessionId)
                    scope.sidebarRight.openTab('cliworker');
            };
            useEffect(() => {
                if (address)
                    return;
                const ids = snapshot.workers.filter((w) => active(w.status)).map((w) => w.runId);
                if (snapshot.configuring)
                    ids.push('configuring');
                if (ids.some((id) => !seen.current.has(id))) {
                    ids.forEach((id) => seen.current.add(id));
                    open();
                }
            }, [snapshot, address]);
            return (_jsxs(_Fragment, { children: [_jsx(HarnessNativeSessionSupports, { bindings: bindings, conversation: scope.conversation, forks: workerForks, api: api }), workerForks && _jsx(HarnessForkNotice, { forks: workerForks }), _jsx(Tooltip, { label: "\u6253\u5F00 CLI Worker", side: "bottom", portal: true, children: _jsx(Button, { variant: "ghost", size: "sm", "aria-label": "\u6253\u5F00 CLI Worker", className: "cwn-entry", icon: _jsx(BrandIcon, { size: 16 }), onClick: open }) })] }));
        }
        scope.effect(() => scope.slots.inject('conversation.session.header.utilities', () => scope.slots.register({ name: 'conversation.session.header.utilities', id: ID, order: -20 }, Header)));
    });
}
//# sourceMappingURL=index.js.map