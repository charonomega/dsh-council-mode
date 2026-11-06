import { homedir } from 'node:os';
import { captureCatalogMetadata } from "./adapters.js";
import { agyIdentityFromCredential } from "./account-identity.js";
import { ProcessCleanupUnconfirmedError } from "./process.js";
const LIMIT = 64 * 1024;
/** agy 1.4.x stores its macOS login through go-keyring; the Windows target is `gemini:antigravity`. */
export const MAC_AGY_KEYCHAIN_ARGUMENTS = [
    '/usr/bin/security',
    'find-generic-password',
    '-s',
    'gemini',
    '-a',
    'antigravity',
    '-w',
];
const ITEM_NOT_FOUND = 44;
export class MacAgyKeychainError extends Error {
    constructor() {
        super('无法读取 macOS 钥匙串中的 Antigravity 账号，请重试');
        this.name = 'MacAgyKeychainError';
    }
}
/** go-keyring's own encodings for values that `security -w` cannot print verbatim. */
export function decodeMacAgyKeychain(output) {
    const text = output.replace(/\r?\n$/, '');
    if (!text)
        return undefined;
    try {
        if (text.length > LIMIT)
            throw new Error('oversized');
        const decoded = text.startsWith('go-keyring-base64:')
            ? Buffer.from(text.slice('go-keyring-base64:'.length), 'base64').toString('utf8')
            : text.startsWith('go-keyring-encoded:')
                ? Buffer.from(text.slice('go-keyring-encoded:'.length), 'hex').toString('utf8')
                : text;
        const value = JSON.parse(decoded);
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('invalid');
        return value;
    }
    catch {
        // Neither the item nor a fragment of it is carried by the error.
        throw new MacAgyKeychainError();
    }
}
/**
 * The keychain item is the only macOS login: `/logout` removes it and leaves a
 * stale token file behind, so a missing item is never answered from that file.
 */
export async function readMacAgyCredential(backend, config, signal) {
    signal.throwIfAborted();
    let output;
    try {
        output = await captureCatalogMetadata(backend, config, [...MAC_AGY_KEYCHAIN_ARGUMENTS], homedir(), signal, undefined, [0, ITEM_NOT_FOUND]);
    }
    catch (error) {
        signal.throwIfAborted();
        if (error instanceof ProcessCleanupUnconfirmedError)
            throw error;
        throw new MacAgyKeychainError();
    }
    signal.throwIfAborted();
    return decodeMacAgyKeychain(output);
}
export function macAgyAccountIdentity(backend, config) {
    return async (cli, signal) => {
        if (cli !== 'antigravity')
            return undefined;
        try {
            const credential = await readMacAgyCredential(backend, config, signal);
            return credential
                ? agyIdentityFromCredential(credential)
                : { state: 'unconfigured', verification: 'local', summary: '尚未登录 Antigravity' };
        }
        catch (error) {
            signal.throwIfAborted();
            if (error instanceof ProcessCleanupUnconfirmedError)
                throw error;
            return { state: 'unavailable', verification: 'local', summary: new MacAgyKeychainError().message };
        }
    };
}
//# sourceMappingURL=agy-macos-account.js.map