import path from 'node:path';
import { realpathSync } from 'node:fs';
import { abortable } from './async.js';

export function memberKey(member) { return member?.sessionId || member?.workerId || ''; }

export function resolveMember(members, key, workers = []) {
  const exact = members.filter((member) => memberKey(member) === key);
  if (exact.length === 1) return exact[0];
  const matches = members.filter((member) => member.name === key || workers.some((worker) => worker.id === member.workerId && worker.agentName === key));
  if (matches.length > 1) throw new Error(`成员名称 "${key}" 有歧义；请使用 council_roster 中的稳定 id。`);
  if (!matches.length) throw new Error(`未找到成员 "${key}"；请调用 council_roster 核对名称或 id。`);
  return matches[0];
}

export function subagentService(ctx) { return typeof ctx?.get === 'function' ? ctx.get('subagents') : ctx?.subagents; }

export async function verifyChild(ctx, parentId, childId, signal) {
  const service = subagentService(ctx);
  if (!service?.listChildren) throw new Error('无法核验原生子智能体：缺少持久子会话目录。');
  const children = await abortable(service.listChildren(parentId, signal), signal);
  const entry = children.find((child) => child.id === childId && child.mode === 'continuable');
  if (!entry) throw new Error('该原生子智能体不属于当前主对话的可续聊子会话目录。');
  const child = ctx?.get?.('agents')?.get(childId);
  if (child) {
    const header = child.session?.header ?? {};
    const parent = header.parentSession ?? header.parentSessionId ?? header.parent;
    if (header.origin !== 'subagent' || (parent && parent !== parentId)) throw new Error('原生子智能体的会话归属不一致。');
  }
  return { entry, child };
}

export function effectivePermission(worker, child) {
  if (worker) return worker.mode === 'plan' || worker.mode === 'read-only' ? 'read-only' : worker.mode === 'accept-edits' || worker.mode === 'bypass' || worker.mode === 'default' ? 'writable' : 'unknown';
  const mode = child?.ctx?.get?.('sandboxPolicy')?.resolve({ session: child.session })?.mode;
  return mode === 'read-only' ? 'read-only' : mode ? 'writable' : 'unknown';
}

/** Scope is a conflict check and prompt contract, not a filesystem sandbox. */
export function canonicalScope(raw, cwd = process.cwd()) {
  if (!raw || /[\x00*?\n\r]/u.test(raw)) throw new Error('write_scope 必须是一个明确的文件或目录路径，不能含通配符。');
  const canonical = (value) => {
    let current = path.resolve(value.replaceAll('\\', path.sep));
    const tail = [];
    for (;;) {
      try { current = path.join(realpathSync.native(current), ...tail); break; }
      catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
        const parent = path.dirname(current);
        if (parent === current) break;
        tail.unshift(path.basename(current)); current = parent;
      }
    }
    const normalized = path.normalize(current).replaceAll('\\', '/').replace(/\/+$/u, '');
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };
  const root = canonical(cwd);
  const scope = canonical(path.resolve(cwd, raw.replaceAll('\\', path.sep)));
  if (scope !== root && !scope.startsWith(root + '/')) throw new Error('write_scope 必须位于当前工作区内。');
  return scope;
}

export function scopesOverlap(a, b) { return a === b || a.startsWith(b + '/') || b.startsWith(a + '/'); }
