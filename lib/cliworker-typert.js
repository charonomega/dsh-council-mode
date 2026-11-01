/** Register the vendored CLI Worker's protocol under its original wire identity.
 * DSH's automatic Typert loader only discovers bare package rows, while this
 * bundle deliberately mounts the vendored implementation by its local path.
 */
import { TYPERT } from '../vendor/dsh-cliworker-now/lib/typert.host.js';

export const inject = ['typert'];
export const readyService = 'cliworkerCouncilTypesReady';

export function apply(ctx) {
  if (ctx.typert.getPackage(TYPERT.package, TYPERT.face)) {
    throw new Error('议会内置 CLI Worker 与独立 CLI Worker 的协议重复。请在插件页面停用或卸载独立 CLI Worker，保留配置与会话记录，再重启 DSH。');
  }
  ctx.effect(() => ctx.typert.register(TYPERT), 'council:cliworker-protocol');
  ctx.provide(readyService, Object.freeze({ package: TYPERT.package, face: TYPERT.face }));
}
