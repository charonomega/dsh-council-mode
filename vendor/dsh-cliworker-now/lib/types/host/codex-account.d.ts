import { type ProcessBackend, type RuntimeConfig } from './process.ts';
import { type AccountIdentity } from './account-identity.ts';
/**
 * Use Codex's effective auth store (file/keyring/auto) rather than an auth.json
 * that may belong to an old account. This handshake sends no task, login, or
 * credential refresh request. Older/unsupported servers safely omit identity.
 */
export declare function readCodexAccount(backend: ProcessBackend, config: RuntimeConfig, executable: string, cwd: string, signal: AbortSignal): Promise<AccountIdentity | undefined>;
