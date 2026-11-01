import { CLI_IDS, EFFORTS } from "../shared/types.js";
import { preferenceReadVersion, SettingsPreferenceSaves } from "./settings-preference-saves.js";
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128;
/** An absent capability uses the old Host path; a malformed scope fails closed. */
export function settingsCacheMetadata(value) {
    if (value === undefined)
        return;
    if (!object(value) || value.policy !== 1 || !id(value.host) || !id(value.project) ||
        !object(value.revisions) || !object(value.preferences) || !object(value.catalogReady))
        throw new Error('设置缓存来源无效，请重新打开设置');
    const revisions = value.revisions;
    if (CLI_IDS.some(cli => !id(revisions[cli])))
        throw new Error('设置缓存来源无效，请重新打开设置');
    const catalogReady = value.catalogReady;
    if (CLI_IDS.some(cli => typeof catalogReady[cli] !== 'boolean'))
        throw new Error('模型目录来源无效，请刷新重试');
    for (const cli of CLI_IDS) {
        const pref = value.preferences[cli];
        if (pref === undefined)
            continue;
        if (!object(pref) || (pref.cli ?? 'antigravity') !== cli || typeof pref.model !== 'string' || !pref.model || pref.model.length > 2048 ||
            !EFFORTS.includes(pref.effort))
            throw new Error('项目默认设置无效，请刷新重试');
    }
    return value;
}
/** Completed display receipts only. No timers, processes, secrets or disk storage. */
export class SettingsDisplayCache {
    metadata;
    preferenceSaves = new SettingsPreferenceSaves();
    accounts = {};
    catalogs = {};
    generations = {};
    constructor(metadata) {
        this.metadata = metadata;
        this.metadata = structuredClone(metadata);
    }
    sync(metadata, enabled, readVersion = preferenceReadVersion()) {
        for (const cli of CLI_IDS) {
            if (!enabled[cli] || metadata.host !== this.metadata.host || metadata.project !== this.metadata.project ||
                metadata.revisions[cli] !== this.metadata.revisions[cli])
                this.invalidate(cli);
            else if (!metadata.catalogReady[cli] && this.catalogs[cli]?.data?.models.length)
                this.invalidate(cli, false);
            this.preferenceSaves.sync(cli, readVersion);
            const catalog = this.catalogs[cli]?.data;
            const receipt = this.preferenceSaves.snapshot(cli);
            if (catalog)
                catalog.preference = structuredClone(receipt.status === 'saved' ? receipt.preference : metadata.preferences[cli]);
        }
        this.metadata = structuredClone(metadata);
    }
    invalidate(cli, discardPreference = true) {
        this.generations[cli] = (this.generations[cli] ?? 0) + 1;
        delete this.accounts[cli];
        delete this.catalogs[cli];
        if (discardPreference)
            this.preferenceSaves.invalidate(cli);
    }
    version(cli) { return this.generations[cli] ?? 0; }
    accountSnapshot() { return structuredClone(this.accounts); }
    catalogSnapshot() { return structuredClone(this.catalogs); }
    account(cli, entry, version = this.version(cli)) {
        if (version !== this.version(cli) || entry.loading || entry.data && entry.data.cli !== cli)
            return;
        this.accounts[cli] = structuredClone(entry);
    }
    catalog(cli, entry, version = this.version(cli)) {
        if (version !== this.version(cli) || entry.loading || entry.data && entry.data.cli !== cli)
            return;
        this.catalogs[cli] = structuredClone(entry);
    }
    preference(cli, preference) {
        const entry = this.catalogs[cli];
        if (entry?.data && (preference.cli ?? 'antigravity') === cli)
            entry.data.preference = structuredClone(preference);
    }
}
class SettingsDisplayPool {
    host;
    projects = new Map();
    pendingWrites = new Map();
    resolve(metadata, enabled, readVersion = preferenceReadVersion()) {
        if (this.host !== metadata.host) {
            for (const cache of this.projects.values())
                cache.preferenceSaves.clear();
            for (const cache of this.pendingWrites.values())
                cache.preferenceSaves.clear();
            this.projects.clear();
            this.pendingWrites.clear();
            this.host = metadata.host;
        }
        for (const [project, cache] of this.pendingWrites)
            if (!cache.preferenceSaves.pending)
                this.pendingWrites.delete(project);
        const cache = this.projects.get(metadata.project) ?? this.pendingWrites.get(metadata.project) ?? new SettingsDisplayCache(structuredClone(metadata));
        this.pendingWrites.delete(metadata.project);
        cache.sync(metadata, enabled, readVersion);
        this.projects.delete(metadata.project);
        this.projects.set(metadata.project, cache);
        if (this.projects.size > 8) {
            const project = this.projects.keys().next().value, evicted = this.projects.get(project);
            if (evicted.preferenceSaves.pending) {
                for (const cli of CLI_IDS)
                    evicted.invalidate(cli, false);
                this.pendingWrites.set(project, evicted);
            }
            this.projects.delete(project);
        }
        return cache;
    }
}
const pools = new WeakMap();
export function settingsDisplayPool(api) {
    let pool = pools.get(api);
    if (!pool) {
        pool = new SettingsDisplayPool();
        pools.set(api, pool);
    }
    return pool;
}
//# sourceMappingURL=settings-display-cache.js.map