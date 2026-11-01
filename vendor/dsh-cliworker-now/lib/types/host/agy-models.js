import { homedir } from 'node:os';
import { join } from 'node:path';
import { localAccountIdentity } from "./account-identity.js";
import { readFirstPartyJson } from "./first-party-models.js";
import { groupAgyModels } from "../shared/models.js";
/** The native consumer directory is account-scoped, not a public model cache. */
export async function assertAgyNativeAccountRoute(signal, home = homedir()) {
    signal.throwIfAborted();
    const settings = await readFirstPartyJson(join(home, '.gemini/antigravity-cli/settings.json'));
    signal.throwIfAborted();
    const configured = (value) => value !== undefined &&
        value !== null &&
        value !== '' &&
        !(Array.isArray(value) && !value.length) &&
        !(typeof value === 'object' && !Object.keys(value).length);
    if (configured(settings.modelProvider) ||
        configured(settings.customModels) ||
        configured(settings.customModelsConfig))
        throw new Error('Antigravity 当前自定义模型来源尚未支持，请使用原生账号模型');
}
export async function discoverAgyAccountModels(capture, signal, home = homedir(), identitySource = localAccountIdentity({ home })) {
    await assertAgyNativeAccountRoute(signal, home);
    const identity = await identitySource('antigravity', signal);
    if (identity?.state !== 'authenticated')
        throw new Error('请先登录 Antigravity');
    const output = await capture();
    signal.throwIfAborted();
    const rows = output.split(/\r?\n/).flatMap((line) => {
        const [id, ...labels] = line.split('\t');
        const label = labels.join(' ').trim();
        return id && label && /^[A-Za-z0-9_.:/-]+$/.test(id) ? [{ id, label }] : [];
    });
    if (!rows.length)
        throw new Error('Antigravity 当前账号暂无可用模型，请刷新');
    return groupAgyModels(rows);
}
//# sourceMappingURL=agy-models.js.map