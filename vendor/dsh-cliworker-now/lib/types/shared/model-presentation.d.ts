import type { ModelChoice, Preference } from './types.ts';
/** Remove one declared route prefix; remaining slashes can belong to a native model ID. */
export declare function nativeModelName(id: string): string;
/** A presentation-only name. Never use the returned text as an execution/lookup ID. */
export declare function displayModelName(value: string | Preference | ModelChoice): string;
/**
 * Present an already-filtered native catalog. Keep the complete raw catalog for
 * validation. A group selects one whole route, never a union of capabilities.
 */
export declare function visibleModelChoices(raw: readonly ModelChoice[], selectedFullId?: string): ModelChoice[];
