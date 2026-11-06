import { type FlowDefinition } from './engine.ts';
export declare const OPENCODE_FLOW: FlowDefinition;
export declare const HERMES_FLOW: FlowDefinition;
/** `hermes auth add nous --type oauth` (auth_commands.py, auth_nous.py, auth_device_flow.py; Hermes
 * 2026-10-29): a login already saved in the home's shared Nous store is imported first, otherwise a
 * device code is shown. Choosing Nous in the window answers the import prompt (user request
 * 2026-10-29). Completion still requires the target's reread account evidence. */
export declare const HERMES_NOUS_FLOW: FlowDefinition;
