import { type CliId } from '../shared/types.ts';
import type { Catalog } from './adapters.ts';
/** Display choices only, never execution authorization. Settings still discover
 * once per Host; a Worker may read a saved list matching its original account. */
export declare class SettingsCatalogCache {
    private ready;
    private pending;
    private revisions;
    private failed;
    private directory;
    constructor(root: string);
    invalidate(cli: CliId): void;
    revision(cli: CliId): number;
    /** This Host's last verified display receipt. Never recovers a disk-only identity. */
    displayBinding(project: string, cli: CliId): string | undefined;
    private key;
    /** Local display read: no account lookup, CLI process or execution admission. */
    display(project: string, cli: CliId, binding: string): Catalog | undefined;
    /** Save a freshly authorized directory without allowing an invalidated query
     * to republish its previous source. Used by the initial dispatch selection. */
    remember(project: string, result: {
        catalog: Catalog;
        binding: string;
    }, revision: number): void;
    private previous;
    get(input: {
        cli: CliId;
        project: string;
        signal: AbortSignal;
        refresh?: boolean;
        /** Qoder discovery itself verifies current account + complete sources before publishing. */
        selfVerifiedDiscovery?: boolean;
        binding: () => Promise<string>;
        discover: () => Promise<{
            catalog: Catalog;
            binding: string;
        }>;
    }): Promise<{
        catalog: Catalog;
        binding: string;
    }>;
}
