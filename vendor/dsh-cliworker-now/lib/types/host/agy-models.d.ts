import { type AccountIdentitySource } from './account-identity.ts';
import type { ModelChoice } from '../shared/types.ts';
/** The native consumer directory is account-scoped, not a public model cache. */
export declare function assertAgyNativeAccountRoute(signal: AbortSignal, home?: string): Promise<void>;
export declare function discoverAgyAccountModels(capture: () => Promise<string>, signal: AbortSignal, home?: string, identitySource?: AccountIdentitySource): Promise<ModelChoice[]>;
