import { type ModelChoice, type Preference } from './types.ts';
/** Only remove an exact, known effort suffix for Antigravity display. Execution keeps the raw ID. */
export declare function modelName(preference: Preference): string;
/** Group only variants explicitly advertised by the CLI, never infer missing levels. */
export declare function groupAgyModels(raw: ModelChoice[]): ModelChoice[];
/** Accept old raw IDs and new grouped choices; return the exact executable preference. */
export declare function resolveModel(preference: Preference, models: ModelChoice[]): Preference;
