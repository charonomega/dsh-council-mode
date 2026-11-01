/** Runs only bounded --help metadata, never login, OAuth refresh or a model prompt. */
export declare function verifyPiOmpExecutable(cli: 'pi' | 'omp', executable: string, capture: (argv: string[], cwd: string, env: Record<string, string>) => Promise<string>): Promise<string>;
