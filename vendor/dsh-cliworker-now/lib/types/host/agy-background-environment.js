/** Keep Windows background queries/tasks from starting AGY's own updater. */
export function agyBackgroundEnvironment(cli, platform = process.platform) {
    return cli === 'antigravity' && platform === 'win32'
        ? { AGY_CLI_DISABLE_AUTO_UPDATE: 'true' }
        : {};
}
//# sourceMappingURL=agy-background-environment.js.map