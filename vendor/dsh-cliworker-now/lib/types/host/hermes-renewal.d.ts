import { HermesNousError, type HermesNousSource } from './hermes-nous.ts';
import { type ProcessBackend } from './process.ts';
type Failure = 'relogin' | 'unavailable' | 'changed' | 'unsupported' | 'busy';
export declare class HermesRenewalError extends HermesNousError {
    readonly state: Failure;
    constructor(state: Failure);
}
export interface HermesRenewalContext {
    backend: ProcessBackend;
    signal: AbortSignal;
    graceMs?: number;
}
export interface HermesRenewalInput {
    home: string;
    signal: AbortSignal;
    backend?: ProcessBackend;
    executable?: string;
    resolveExecutable?: (signal: AbortSignal) => Promise<string>;
    graceMs?: number;
}
/** No bearer, refresh token or email enters the command line or public result. */
export declare function hermesNousPrincipalDigest(source: HermesNousSource): string;
/** Share only an in-flight renewal, never a completed authorization decision. */
export declare function ensureHermesNousFresh(input: HermesRenewalInput): Promise<void>;
/** Hold until the account terminal's entire managed range has exited. */
export declare function reserveHermesAccount(home: string, signal: AbortSignal): Promise<() => void>;
export {};
