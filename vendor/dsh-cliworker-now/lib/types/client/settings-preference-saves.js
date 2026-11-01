import { operationMessage } from "./operation-error.js";
let receiptVersion = 0;
/** Capture before a metadata request, so an older read cannot erase a later save receipt. */
export function preferenceReadVersion() { return receiptVersion; }
/** Explicit edits only. Leaving flushes a snapshot; closing does not abort its write. */
export class SettingsPreferenceSaves {
    slots = new Map();
    get pending() { return [...this.slots.values()].some(slot => slot.active || slot.waiting); }
    clear() { for (const cli of this.slots.keys())
        this.invalidate(cli); }
    slot(cli) {
        let slot = this.slots.get(cli);
        if (!slot) {
            slot = { revision: 0, generation: 0, savedVersion: 0, state: { status: 'idle', saving: false }, listeners: new Set() };
            this.slots.set(cli, slot);
        }
        return slot;
    }
    snapshot(cli) { return this.slot(cli).state; }
    subscribe(cli, listener) {
        const slot = this.slot(cli);
        slot.listeners.add(listener);
        return () => { slot.listeners.delete(listener); };
    }
    publish(slot, state) {
        slot.state = state;
        for (const listener of slot.listeners)
            listener();
    }
    stage(preference, write, saved) {
        const slot = this.slot(preference.cli ?? 'antigravity');
        slot.draft = { revision: ++slot.revision, preference: structuredClone(preference), write, saved };
        this.publish(slot, { status: 'draft', saving: !!slot.active, preference: structuredClone(preference) });
    }
    flush(cli) {
        const slot = this.slot(cli);
        if (!slot.draft || slot.active?.draft.revision === slot.draft.revision)
            return;
        slot.waiting = slot.draft;
        this.drain(slot);
    }
    /** A new source must never receive a draft selected against the previous source. */
    invalidate(cli) {
        const slot = this.slot(cli);
        slot.generation++;
        slot.draft = slot.waiting = undefined;
        slot.active?.controller.abort();
        this.publish(slot, { status: 'idle', saving: !!slot.active });
    }
    /** A fresh Host snapshot owns settled defaults; preserve unfinished or failed edits. */
    sync(cli, readVersion = preferenceReadVersion()) {
        const slot = this.slot(cli);
        if (slot.state.status === 'saved' && slot.savedVersion <= readVersion)
            this.publish(slot, { status: 'idle', saving: !!slot.active });
    }
    drain(slot) {
        if (slot.active || !slot.waiting)
            return;
        const draft = slot.waiting, generation = slot.generation;
        slot.waiting = undefined;
        const active = { controller: new AbortController(), draft };
        slot.active = active;
        this.publish(slot, { ...slot.state, status: slot.draft === draft ? 'saving' : slot.state.status, saving: true });
        const current = () => slot.generation === generation && !active.controller.signal.aborted;
        void Promise.resolve().then(async () => {
            if (!current())
                return;
            try {
                const saved = await draft.write(draft.preference, active.controller.signal);
                if (!current())
                    return;
                slot.savedVersion = ++receiptVersion;
                draft.saved(saved);
                if (slot.draft === draft) {
                    slot.draft = undefined;
                    this.publish(slot, { status: 'saved', saving: true, preference: structuredClone(saved) });
                }
            }
            catch (error) {
                if (current() && slot.draft === draft)
                    this.publish(slot, { status: 'failed', saving: true, preference: draft.preference,
                        error: `${operationMessage(error)}；离开此页或关闭设置时重试` });
            }
        }).finally(() => {
            slot.active = undefined;
            this.publish(slot, { ...slot.state, saving: false });
            this.drain(slot);
        });
    }
}
//# sourceMappingURL=settings-preference-saves.js.map