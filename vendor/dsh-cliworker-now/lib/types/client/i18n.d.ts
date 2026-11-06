import type { Context } from '@deepseek-ai/cordis';
import type { LanguagePreference } from '../shared/cli-settings.ts';
import { type MessageKey } from './i18n-messages.ts';
export type { MessageKey } from './i18n-messages.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** CLI Worker copy; the Chinese source text is the key. */
        cliworker: MessageKey;
    }
}
export declare const LOCALE_NS = "cliworker";
export type UiLanguage = 'zh' | 'en';
export type TranslateParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;
/** The Chinese dictionary is the identity map over the source keys. */
export declare const zh: Record<MessageKey, string>;
/** Effective language: an explicit choice, else DSH's, else Chinese without a locale service. */
export declare function uiLanguage(): UiLanguage;
/** BCP 47 tag for dates and numbers in the effective language. */
export declare const formatLocale: () => "en-US" | "zh-CN";
/** Translate at call time; components rendering copy must also call {@link useT}. */
export declare const t: Translate;
/** Effort names stay native except the plugin's own `default` label. */
export declare const effortLabel: (effort: string) => string;
export declare function languagePreference(): LanguagePreference;
/** Adopt a saved or streamed preference; unknown values are ignored. */
export declare function setLanguagePreference(next: unknown): void;
/** Subscribe the calling component to language changes and return the current translator. */
export declare function useT(): Translate;
/**
 * Register the `cliworker` dictionaries with Harness locale and follow its
 * active language. Both are owned effects of the optional `locale` scope.
 */
export declare function installClientLocale(ctx: Context): void;
