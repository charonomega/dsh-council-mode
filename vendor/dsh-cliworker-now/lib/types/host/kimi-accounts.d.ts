import type { AccountIdentity } from './account-identity.ts';
export declare const KIMI_MANAGE_LOGIN = "\u5DF2\u767B\u5F55 Kimi\u3002\u82E5\u51FA\u73B0 Trust \u63D0\u793A\uFF0C\u8BF7\u81EA\u884C\u786E\u8BA4\u6B64\u7A7A\u8D26\u53F7\u76EE\u5F55\uFF1B\u5207\u6362\u8D26\u53F7\u8F93\u5165 /logout\uFF0C\u518D\u8F93\u5165 /login\u3002";
/** Native Kimi has no --no-mcp switch and asks Trust even for an empty folder.
 * Its findGitWorkTree stops at the first .git directory. An empty owned marker
 * keeps project MCP lookup here even when plugin state lives under a repository.
 * Never mark the folder trusted or change the native account home. */
export declare function prepareKimiAccountDirectory(stateDirectory: string, signal: AbortSignal): Promise<{
    cwd: string;
    cleanup: () => Promise<void>;
}>;
/** No-follow, bounded read; never refreshes, creates or modifies the native token. */
export declare function readKimiOwnToken(directory: string, slot: string, signal: AbortSignal): Promise<Record<string, any> | undefined>;
/** Consume native `provider list --json` internally; only safe identity metadata escapes. */
export declare function readKimiAccount(raw: string, signal: AbortSignal, options?: {
    home?: string;
    now?: number;
}): Promise<AccountIdentity>;
