import { catalogFor, resolveCliExecutable, validatePreference } from "./adapters.js";
import { readCliAccountBinding } from "./cli-account-binding.js";
import { withWindowsAgyAccountSnapshot } from "./agy-windows-account.js";
import { withQoderCatalogSnapshot } from "./qoder-accounts.js";
import { resolveModel } from "../shared/models.js";
import { cliOf } from "../shared/types.js";
export const ACCOUNT_CHANGED = '账号已变更，请重新选择或新建任务';
/** Private authorization state: never spread this object into a Remote response. */
export async function authorizedCatalog(cli, backend, config, project, signal, expected) {
    try {
        return await authorizedCatalogOnce(cli, backend, config, project, signal, expected);
    }
    catch (error) {
        // The account changed while its catalog was read: read the one signed in now,
        // silently, unless the caller holds a specific account.
        if (expected || !(error instanceof Error) || error.message !== ACCOUNT_CHANGED)
            throw error;
        signal.throwIfAborted();
        return authorizedCatalogOnce(cli, backend, config, project, signal);
    }
}
async function authorizedCatalogOnce(cli, backend, config, project, signal, expected) {
    const discover = async () => {
        const binding = await readCliAccountBinding(cli, backend, config, project, signal);
        if (expected && binding !== expected)
            throw new Error(ACCOUNT_CHANGED);
        const catalog = await catalogFor(cli, backend, config, project, signal);
        return { binding, catalog };
    };
    const { binding, catalog } = (cli === 'qoder' || cli === 'qodercn')
        ? await withQoderCatalogSnapshot(backend, config, await resolveCliExecutable(cli, backend, config, signal), project, signal, discover, cli)
        : cli === 'antigravity' && process.platform === 'win32'
            ? await withWindowsAgyAccountSnapshot(backend, config, signal, discover)
            : await discover();
    signal.throwIfAborted();
    // Qoder verifies fresh complete local sources after its combined native
    // account/catalog operation. Other protocols re-read their native binding.
    if (cli !== 'qoder' && cli !== 'qodercn' && binding !== (await readCliAccountBinding(cli, backend, config, project, signal)))
        throw new Error(ACCOUNT_CHANGED);
    if (catalog.cli !== cli)
        throw new Error('CLI 模型目录身份不匹配');
    if (!catalog.models.length)
        throw new Error('暂无可确认的可用模型，请登录或刷新');
    return { catalog, binding };
}
export async function authorizeSelection(preference, backend, config, project, signal, expected) {
    const result = await authorizedCatalog(cliOf(preference), backend, config, project, signal, expected);
    validatePreference(preference, result.catalog);
    return { ...result, preference: resolveModel(preference, result.catalog.models) };
}
//# sourceMappingURL=authorized-catalog.js.map