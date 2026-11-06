import type { AccountAction, AccountLoginMode } from '../../shared/accounts.ts';
import type { CliId } from '../../shared/types.ts';
import { type AccountGuideDriver, type FlowDefinition } from './engine.ts';
export declare function accountFlow(cli: CliId): FlowDefinition | undefined;
export declare function createAccountGuide(cli: CliId, action: AccountAction, options?: {
    provider?: string;
    mode?: AccountLoginMode;
    login?: string;
    stores?: string;
}): AccountGuideDriver | undefined;
