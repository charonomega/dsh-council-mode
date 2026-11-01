import { type CliId } from '../shared/types.ts';
export interface CliExecutablePath {
    mode: 'auto' | 'manual';
    path: string;
}
export interface CliExecutablePathStoreOptions {
    platform?: NodeJS.Platform;
    hostname?: string;
}
/** Private per-machine path choices. WorkerStorage's Host lock owns the enclosing directory. */
export declare class CliExecutablePathStore {
    private readonly root;
    private readonly directory;
    private readonly file;
    private readonly identity;
    private readonly platform;
    constructor(root: string, options?: CliExecutablePathStoreOptions);
    read(cli: CliId): CliExecutablePath | undefined;
    revision(cli: CliId): number;
    setManual(cli: CliId, path: string): void;
    reset(cli: CliId): void;
    remember(cli: CliId, path: string, expectedRevision: number): boolean;
    private samePath;
    private next;
    private privateDirectory;
    private prepare;
    private fileInfo;
    private load;
    private save;
}
