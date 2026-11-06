import { useSyncExternalStore } from 'react';
import { effortLabel as sharedEffortLabel } from "../shared/types.js";
import { en } from "./i18n-messages.js";
export const LOCALE_NS = 'cliworker';
/** The Chinese dictionary is the identity map over the source keys. */
export const zh = Object.fromEntries(Object.keys(en).map((key) => [key, key]));
// One module-level store: copy is also produced by plain helpers (status
// labels, errors, formatting) that never receive props.
let preference = 'follow';
let harness;
let revision = 0;
const listeners = new Set();
const fill = (template, params) => params ? template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match)) : template;
function lookup(key, params) {
    if (preference === 'follow' && harness)
        return harness.translate(key, params);
    return fill(uiLanguage() === 'en' ? en[key] : key, params);
}
/** Rebound per revision so memoized consumers keyed on `t` refresh. */
let bound = (key, params) => lookup(key, params);
function publish() {
    revision += 1;
    bound = (key, params) => lookup(key, params);
    for (const listener of listeners)
        listener();
}
/** Effective language: an explicit choice, else DSH's, else Chinese without a locale service. */
export function uiLanguage() {
    if (preference !== 'follow')
        return preference;
    if (!harness)
        return 'zh';
    return /^zh(?:-|$)/i.test(harness.active) ? 'zh' : 'en';
}
/** BCP 47 tag for dates and numbers in the effective language. */
export const formatLocale = () => (uiLanguage() === 'en' ? 'en-US' : 'zh-CN');
/** Translate at call time; components rendering copy must also call {@link useT}. */
export const t = (key, params) => bound(key, params);
/** Effort names stay native except the plugin's own `default` label. */
export const effortLabel = (effort) => (effort === 'default' ? t('默认') : sharedEffortLabel(effort));
export function languagePreference() {
    return preference;
}
/** Adopt a saved or streamed preference; unknown values are ignored. */
export function setLanguagePreference(next) {
    const value = next === undefined ? 'follow' : next === 'follow' || next === 'zh' || next === 'en' ? next : undefined;
    if (!value || value === preference)
        return;
    preference = value;
    publish();
}
function subscribe(listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
const currentRevision = () => revision;
/** Subscribe the calling component to language changes and return the current translator. */
export function useT() {
    useSyncExternalStore(subscribe, currentRevision, currentRevision);
    return bound;
}
/**
 * Register the `cliworker` dictionaries with Harness locale and follow its
 * active language. Both are owned effects of the optional `locale` scope.
 */
export function installClientLocale(ctx) {
    ctx.inject(['locale'], (scope) => {
        const locale = scope.locale;
        scope.effect(() => locale.register(LOCALE_NS, { zh, en }), 'cliworker:locale-dictionary');
        scope.effect(() => {
            const translate = locale.bind(LOCALE_NS);
            const sync = () => {
                const snapshot = locale.getLocale();
                if (harness?.active === snapshot.active && harness.revision === snapshot.revision)
                    return;
                harness = { active: snapshot.active, revision: snapshot.revision, translate };
                publish();
            };
            sync();
            const off = locale.subscribe(sync);
            return () => {
                off();
                harness = undefined;
                publish();
            };
        }, 'cliworker:locale-follow');
    });
}
//# sourceMappingURL=i18n.js.map