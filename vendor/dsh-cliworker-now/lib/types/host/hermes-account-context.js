import { chmodSync, closeSync, constants, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, writeFileSync, } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { hermesHomeDirectory, validateHermesHomeDirectory } from "./hermes-adapter.js";
const markerText = '{"version":1,"source":"plugin-native"}\n';
function paths(config) {
    const root = validateHermesHomeDirectory(resolve(config.stateDirectory ?? join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'cliworker-now')));
    return {
        root,
        parent: join(root, 'accounts'),
        home: join(root, 'accounts', 'hermes'),
        marker: join(root, 'accounts', 'hermes-source.json'),
    };
}
function selected(marker) {
    let fd;
    try {
        fd = openSync(marker, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        const info = fstatSync(fd);
        if (!info.isFile() || info.nlink !== 1 || info.size > 256 || readFileSync(fd, 'utf8') !== markerText)
            throw new Error('Hermes 账号来源记录无效，请检查插件目录');
        return true;
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
    finally {
        if (fd !== undefined)
            closeSync(fd);
    }
}
/** Once explicitly selected, this home remains authoritative even after logout/deletion.
 * The marker is outside native writable account storage and contains no credentials. */
export function effectiveHermesHome(config) {
    const own = paths(config);
    for (const path of [own.parent, own.home]) {
        try {
            if (lstatSync(path).isSymbolicLink())
                throw new Error('Unsafe Hermes account directory');
        }
        catch (error) {
            if (error.code !== 'ENOENT')
                throw error;
        }
    }
    return selected(own.marker) ? validateHermesHomeDirectory(own.home) : hermesHomeDirectory(config.hermesHome);
}
/** Only an explicit account action establishes this source. Never copy global auth/config. */
export function prepareHermesAccountHome(config) {
    // Validate the previous source as well; a misconfigured root must not widen a sandbox grant.
    hermesHomeDirectory(config.hermesHome);
    const own = paths(config);
    for (const path of [own.root, own.parent, own.home]) {
        mkdirSync(path, { recursive: true, mode: 0o700 });
        const info = lstatSync(path);
        if (!info.isDirectory() || info.isSymbolicLink())
            throw new Error('Unsafe Hermes account directory');
        chmodSync(path, 0o700);
    }
    // Native setup merges its defaults and writes its own model/account choices later.
    try {
        writeFileSync(join(own.home, 'config.yaml'), 'auth:\n  adopt_external_logins: false\n', {
            flag: 'wx',
            mode: 0o600,
        });
    }
    catch (error) {
        if (error.code !== 'EEXIST')
            throw error;
    }
    if (!selected(own.marker)) {
        try {
            writeFileSync(own.marker, markerText, { flag: 'wx', mode: 0o600 });
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
        }
    }
    if (!selected(own.marker))
        throw new Error('Hermes 账号来源记录无法保存');
    return validateHermesHomeDirectory(own.home);
}
/** Native account selectors must not inherit a Host-managed overlay or secret helper. */
export function hermesAccountEnvironment(home) {
    return {
        HERMES_HOME: home,
        HERMES_MANAGED_DIR: join(home, '.cliworker-managed'),
        HERMES_PROFILE: '',
        HERMES_SAFE_MODE: '1',
        HERMES_IGNORE_RULES: '1',
        HERMES_YOLO_MODE: '0',
        HERMES_ACCEPT_HOOKS: '0',
        HERMES_DISABLE_LAZY_INSTALLS: '1',
    };
}
//# sourceMappingURL=hermes-account-context.js.map