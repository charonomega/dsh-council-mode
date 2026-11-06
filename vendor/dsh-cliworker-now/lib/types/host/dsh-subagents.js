import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { SessionId } from '@deepseek-ai/dsh-session/types';
import { DSH_AGENT_NAME } from "../shared/types.js";
import { atomicJSON } from "./storage.js";
const hiddenSchema = z.record(z.string(), z.array(z.string()));
const namesSchema = z.record(z.string(), z.record(z.string(), z.string().regex(DSH_AGENT_NAME)));
export function dshStatus(timing) {
    if (timing?.active)
        return 'running';
    if (timing?.lastTurnCompleted === true)
        return 'completed';
    if (timing?.lastTurnCompleted === false)
        return 'failed';
    return 'unknown';
}
/** Native children remain DSH-owned. Only the hidden directory is written here. */
export class DshSubagents {
    directory;
    services;
    hidden;
    names;
    lifetime = new AbortController();
    listeners = new Set();
    cleanups = new Set();
    stopped = new Map();
    warned = new Set();
    constructor(directory, services) {
        this.directory = directory;
        this.services = services;
    }
    warn(reason) {
        if (this.warned.has(reason))
            return;
        this.warned.add(reason);
        this.services.log(reason);
    }
    readHidden() {
        if (!this.hidden) {
            const file = join(this.directory, 'dsh-hidden.json');
            this.hidden = existsSync(file)
                ? hiddenSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
                : Object.create(null);
        }
        return this.hidden;
    }
    readNames() {
        if (!this.names) {
            const file = join(this.directory, 'dsh-names.json');
            this.names = existsSync(file)
                ? namesSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
                : Object.create(null);
        }
        return this.names;
    }
    persist(file, value) {
        mkdirSync(this.directory, { recursive: true, mode: 0o700 });
        chmodSync(this.directory, 0o700);
        atomicJSON(join(this.directory, file), value);
    }
    /** Stable `dsh-N` per main conversation in creation order; hidden children keep theirs so names never move. */
    nameChildren(parent, catalog) {
        const current = this.readNames()[parent] ?? {};
        const missing = catalog
            .filter((child) => !current[child.id] && !this.services.ownedSessions().has(child.id))
            .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
        if (!missing.length)
            return current;
        let next = Math.max(0, ...Object.values(current).map((name) => Number(name.slice(4))));
        const named = { ...current };
        for (const child of missing)
            named[child.id] = `dsh-${++next}`;
        const all = { ...this.readNames(), [parent]: named };
        this.persist('dsh-names.json', all);
        this.names = all;
        return named;
    }
    async catalog(parent, signal) {
        if (!parent.trim())
            throw new Error('DSH 主会话无效');
        const service = this.services.subagents(), query = this.services.query();
        if (!service || !query)
            throw new Error('DSH subagents/sessionQuery service unavailable');
        const observation = await query.observeSession(SessionId(parent), { signal });
        try {
            if (!observation.projections)
                throw new Error('DSH public projections unavailable');
            if (observation.header.origin === 'subagent')
                throw new Error('DSH 目录只接受主会话');
        }
        finally {
            observation[Symbol.dispose]();
        }
        return service.listChildren(SessionId(parent), signal);
    }
    async projection(id, parent, signal) {
        const query = this.services.query();
        if (!query)
            throw new Error('DSH public projections unavailable');
        const observation = await query.observeSession(SessionId(id), { signal });
        try {
            if (observation.header.origin !== 'subagent' || observation.header.parentSession !== parent)
                throw new Error('DSH 子会话所属主对话不匹配');
            if (!observation.projections)
                throw new Error('DSH public projections unavailable');
            return { ...observation.projections.values, cursor: observation.cursor };
        }
        finally {
            observation[Symbol.dispose]();
        }
    }
    async list(parent, caller) {
        const signal = AbortSignal.any([caller, this.lifetime.signal]);
        try {
            signal.throwIfAborted();
            const catalog = await this.catalog(parent, signal);
            const owned = this.services.ownedSessions(), hidden = this.readHidden()[parent] ?? [], names = this.nameChildren(parent, catalog);
            const rows = [];
            for (const child of catalog) {
                if (owned.has(child.id) || hidden.includes(child.id))
                    continue;
                const row = {
                    id: child.id,
                    parentSessionId: parent,
                    name: child.label || child.id,
                    agentName: names[child.id],
                    createdAt: child.createdAt,
                    mode: child.mode,
                    status: 'unknown',
                };
                if (child.mode !== 'external') {
                    try {
                        const projection = await this.projection(child.id, parent, signal);
                        row.status = dshStatus(projection.subagentTiming);
                        row.model = (projection.modelSelection?.next ?? projection.modelSelection?.lastUsed)?.model;
                        row.stopped =
                            (this.stopped.get(child.id) === projection.cursor && row.status !== 'running') || undefined;
                        if (!row.stopped)
                            this.stopped.delete(child.id);
                    }
                    catch {
                        signal.throwIfAborted();
                        this.warn('DSH child projection unavailable; status remains unknown');
                    }
                }
                rows.push(row);
            }
            signal.throwIfAborted();
            return rows;
        }
        catch (error) {
            signal.throwIfAborted();
            // Never include native content or raw service errors in logs.
            this.warn(error instanceof Error && /unavailable/.test(error.message)
                ? 'DSH directory service/projection unavailable; returning an empty group'
                : 'DSH directory read failed; returning an empty group');
            return [];
        }
    }
    async requireChild(parent, id, signal, writable = false) {
        const child = (await this.catalog(parent, signal)).find((entry) => entry.id === id);
        if (!child || this.services.ownedSessions().has(id) || this.readHidden()[parent]?.includes(id))
            throw new Error('DSH 子 Agent 不在当前主会话列表中');
        if (writable && child.mode !== 'continuable')
            throw new Error('此 DSH 子 Agent 只读');
        return child;
    }
    async prompt(request, caller) {
        const signal = AbortSignal.any([caller, this.lifetime.signal]);
        await this.requireChild(request.parentSessionId, request.childSessionId, signal, true);
        signal.throwIfAborted();
        return this.services.subagents().prompt(request, signal);
    }
    /** Exact `dsh-N` (case-insensitive) or child ID among this conversation's visible native children. */
    async resolve(parent, ref, caller) {
        const signal = AbortSignal.any([caller, this.lifetime.signal]);
        const catalog = await this.catalog(parent, signal);
        const names = this.nameChildren(parent, catalog);
        const wanted = ref.name?.trim().toLowerCase();
        const id = ref.id ?? Object.keys(names).find((key) => names[key] === wanted);
        if (!id || !catalog.some((entry) => entry.id === id) || (ref.id && wanted && names[ref.id] !== wanted))
            return undefined;
        const child = await this.requireChild(parent, id, signal);
        return { id: child.id, agentName: names[child.id], mode: child.mode, title: child.label || child.id };
    }
    /** Main-agent follow-up by name. The reply arrives through DSH's own child→parent message. */
    async followup(parent, ref, text, caller) {
        const child = await this.resolve(parent, ref, caller);
        if (!child)
            return undefined;
        if (child.mode !== 'continuable')
            throw new Error('此 DSH 子 Agent 只读');
        const receipt = await this.prompt({
            parentSessionId: SessionId(parent), childSessionId: SessionId(child.id),
            requestId: randomUUID(),
            mode: 'continuable', delivery: 'queue', content: [{ type: 'text', text }],
        }, caller);
        return { kind: 'dsh-subagent', workerId: child.id, agentName: child.agentName, title: child.title, receipt,
            guidance: '已交给 DSH 原生子 Agent；回复会以 DSH 子 Agent 消息回到本对话，不需要轮询。' };
    }
    async hide(parent, id, caller) {
        const signal = AbortSignal.any([caller, this.lifetime.signal]);
        await this.requireChild(parent, id, signal);
        signal.throwIfAborted();
        const current = this.readHidden();
        const next = { ...current, [parent]: [...new Set([...(current[parent] ?? []), id])] };
        this.persist('dsh-hidden.json', next);
        this.hidden = next;
        this.listeners.forEach((notify) => notify());
    }
    async stop(parent, id, caller) {
        // Bound an unconfirmed stop; a timeout is an error, never success.
        const timeout = new AbortController();
        const deadline = setTimeout(() => timeout.abort(new Error('DSH 停止尚未确认，请重试')), 30_000);
        const signal = AbortSignal.any([caller, this.lifetime.signal, timeout.signal]);
        try {
            await this.requireChild(parent, id, signal, true);
            signal.throwIfAborted();
            const receipt = this.services
                .subagents()
                .interruptByParent(SessionId(id), SessionId(parent), 'continuable');
            if (!receipt.accepted)
                throw new Error('DSH 中断请求未获确认');
            // Re-read immutable public cuts until the turn is demonstrably closed. An
            // absent child, absent timing or inactive directory row is not proof.
            while (true) {
                signal.throwIfAborted();
                const projection = await this.projection(id, parent, signal);
                const state = dshStatus(projection.subagentTiming);
                if (state === 'completed' || state === 'failed') {
                    signal.throwIfAborted();
                    this.stopped.set(id, projection.cursor);
                    this.listeners.forEach((notify) => notify());
                    return { stopped: true };
                }
                await new Promise((resolve, reject) => {
                    const finish = () => {
                        clearTimeout(timer);
                        signal.removeEventListener('abort', abort);
                        resolve();
                    };
                    const abort = () => {
                        clearTimeout(timer);
                        signal.removeEventListener('abort', abort);
                        reject(signal.reason);
                    };
                    const timer = setTimeout(finish, 100);
                    signal.addEventListener('abort', abort, { once: true });
                    if (signal.aborted)
                        abort();
                });
            }
        }
        finally {
            clearTimeout(deadline);
        }
    }
    /** The client owns this stream only while its panel/document is visible. */
    async *watch(parent, caller) {
        const signal = AbortSignal.any([caller, this.lifetime.signal]);
        let dirty = true, wake;
        let children = new Set();
        const notify = () => {
            dirty = true;
            wake?.();
        };
        const unsubscribe = this.services.subscribe?.((id) => {
            if (id === parent || children.has(id))
                notify();
        });
        const timer = unsubscribe ? undefined : setInterval(notify, 2000);
        this.listeners.add(notify);
        signal.addEventListener('abort', notify);
        let released = false;
        const release = () => {
            if (released)
                return;
            released = true;
            unsubscribe?.();
            clearInterval(timer);
            this.listeners.delete(notify);
            signal.removeEventListener('abort', notify);
            this.cleanups.delete(release);
        };
        this.cleanups.add(release);
        try {
            while (!signal.aborted) {
                if (!dirty)
                    await new Promise((resolve) => {
                        wake = resolve;
                    });
                wake = undefined;
                if (signal.aborted)
                    return;
                dirty = false;
                const rows = await this.list(parent, signal);
                children = new Set(rows.map((row) => row.id));
                yield JSON.stringify(rows);
            }
        }
        finally {
            release();
        }
    }
    dispose() {
        this.lifetime.abort();
        for (const release of this.cleanups)
            release();
        this.listeners.clear();
        this.stopped.clear();
    }
}
//# sourceMappingURL=dsh-subagents.js.map