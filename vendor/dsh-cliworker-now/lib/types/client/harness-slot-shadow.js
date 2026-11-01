/** Borrow a native cell's metadata, leaving its child declarations with the owner. */
export function shadowHarnessSlot(slots, name, id, replace) {
    let original, own;
    let unregister;
    let updating = false;
    const sync = () => {
        if (updating)
            return;
        const next = slots
            .entries(name)
            .filter((entry) => entry !== own && entry.options.id === id)
            .sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0))[0];
        if (next === original)
            return;
        updating = true;
        unregister?.();
        own = undefined;
        original = next;
        if (next) {
            const replacement = replace(next);
            const dispose = slots.register({
                ...next.options,
                name,
                priority: (next.options.priority ?? 0) - 1,
                ...(next.locale ? { locale: next.locale } : {}),
                ...(next.store ? { store: next.store } : {}),
                ...(replacement.inject ? { inject: replacement.inject } : {}),
            }, replacement.component);
            const shadow = slots.entries(name).find((entry) => entry.component === replacement.component);
            // Disposing an entry that carries children collapses every child slot. The
            // Cordis scope may dispose this registration before our own cleanup runs
            // (hot reload), so expose the borrowed children only while it is listed.
            if (shadow && next.children)
                Object.defineProperty(shadow, 'children', {
                    configurable: true,
                    enumerable: true,
                    get: () => (slots.entries(name).includes(shadow) ? next.children : undefined),
                });
            own = shadow;
            unregister = dispose;
        }
        else
            unregister = undefined;
        updating = false;
    };
    const off = slots.subscribe(name, sync);
    sync();
    return () => {
        updating = true;
        off();
        unregister?.();
    };
}
//# sourceMappingURL=harness-slot-shadow.js.map