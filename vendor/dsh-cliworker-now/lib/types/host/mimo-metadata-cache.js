import { createHash } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { nativeLaunchArgv } from './native-launch.mjs';
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** No raw environment, configuration or account material is retained in the cache key. */
export async function nativeMetadataKey(executable, project, snapshot, signal) {
    signal.throwIfAborted();
    try {
        // Use the same static launch plan as the process boundary. A fixed Bun shim
        // can stay unchanged while its actual runtime or script is upgraded.
        const launch = nativeLaunchArgv([executable]);
        const identities = [];
        for (const path of new Set([executable, ...launch.filter(isAbsolute)])) {
            const entry = await realpath(path), identity = await stat(entry);
            signal.throwIfAborted();
            if (!identity.isFile())
                return;
            identities.push([entry, identity.dev, identity.ino, identity.size, identity.mtimeMs, identity.ctimeMs]);
        }
        const physicalProject = await realpath(project);
        signal.throwIfAborted();
        return digest({
            launch,
            project,
            physicalProject,
            identities,
            environment: Object.entries(process.env).sort(([a], [b]) => a.localeCompare(b)),
            snapshot,
        });
    }
    catch {
        signal.throwIfAborted();
        // An unverifiable executable still follows the uncached native validation path.
        return;
    }
}
export const mimoMetadataKey = nativeMetadataKey;
function currentCredential(source, own) {
    for (const path of source.sourceIds) {
        const value = path === own.authPath
            ? own.auth[source.provider]
            : {
                type: 'api',
                key: own.configurations.find((item) => item.path === path)?.value.provider?.[source.provider]
                    ?.options?.apiKey,
            };
        if (value?.type !== 'api' || typeof value.key !== 'string' || !value.key)
            continue;
        const credential = { type: 'api', key: value.key };
        if (digest(credential) === source.credentialHash)
            return credential;
    }
}
/** Only native capabilities are reused. Remote entitlement discovery must still run on every call. */
export class MimoMetadataCache {
    ttlMs;
    limit;
    entries = new Map();
    constructor(ttlMs = 30_000, limit = 16) {
        this.ttlMs = ttlMs;
        this.limit = limit;
    }
    get(key, own) {
        if (!key)
            return;
        const entry = this.entries.get(key), now = Date.now();
        if (!entry)
            return;
        if (now < entry.created || now - entry.created >= this.ttlMs) {
            this.entries.delete(key);
            return;
        }
        const sources = [];
        for (const metadata of entry.sources) {
            const credential = currentCredential(metadata, own);
            if (!credential) {
                this.entries.delete(key);
                return;
            }
            const { credentialHash: _, ...source } = metadata;
            sources.push({ ...structuredClone(source), credential });
        }
        return sources;
    }
    set(key, sources, own) {
        if (!key || !sources.length)
            return;
        const metadata = [];
        for (const source of sources) {
            if (source.credential.type !== 'api')
                return;
            // A user-defined URL may itself carry a credential; such sources stay uncached.
            try {
                const url = new URL(source.baseUrl || '');
                if (url.username || url.password || url.search || url.hash)
                    return;
            }
            catch {
                return;
            }
            const { credential, ...capabilities } = source;
            if (credential.key && JSON.stringify(capabilities).includes(credential.key))
                return;
            const entry = { ...structuredClone(capabilities), credentialHash: digest(credential) };
            if (!currentCredential(entry, own))
                return;
            metadata.push(entry);
        }
        const now = Date.now();
        for (const [id, entry] of this.entries)
            if (now < entry.created || now - entry.created >= this.ttlMs)
                this.entries.delete(id);
        this.entries.delete(key);
        this.entries.set(key, { created: now, sources: metadata });
        while (this.entries.size > this.limit)
            this.entries.delete(this.entries.keys().next().value);
    }
}
export const mimoMetadataCache = new MimoMetadataCache();
//# sourceMappingURL=mimo-metadata-cache.js.map