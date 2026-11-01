import { type Catalog } from './adapters.ts';
import { type CliId, type Preference } from '../shared/types.ts';
import type { ProcessBackend, RuntimeConfig } from './process.ts';
export declare const ACCOUNT_CHANGED = "\u8D26\u53F7\u5DF2\u53D8\u66F4\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u6216\u65B0\u5EFA\u4EFB\u52A1";
/** Private authorization state: never spread this object into a Remote response. */
export declare function authorizedCatalog(cli: CliId, backend: ProcessBackend, config: RuntimeConfig, project: string, signal: AbortSignal, expected?: string): Promise<{
    catalog: Catalog;
    binding: string;
}>;
export declare function authorizeSelection(preference: Preference, backend: ProcessBackend, config: RuntimeConfig, project: string, signal: AbortSignal, expected?: string): Promise<{
    preference: Preference;
    catalog: Catalog;
    binding: string;
}>;
