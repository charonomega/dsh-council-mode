import { abortable, closeIterator } from './async.js';
/** Thin, testable wrapper around the installed CLI Worker Host service. */

function parseJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function activeStatus(status) {
  return status === 'queued' || status === 'running' || status === 'stopping';
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function createCliWorkerAdapter(ctx) {
  function service() {
    const cliworker = ctx.get('cliworker');
    if (!cliworker || typeof cliworker.watch !== 'function' || typeof cliworker.followup !== 'function') {
      throw new Error('未检测到可用的 CLI Worker 服务；请先安装 dsh-cliworker-now 并至少登录一个 CLI。');
    }
    return cliworker;
  }

  return {
    isAvailable() {
      return !!ctx.get('cliworker');
    },

    /** Read the first snapshot of one watch stream. */
    async snapshotOnce(parentSessionId, workerId, signal) {
      const cliworker = service();
      const controller = new AbortController();
      const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      const iterator = cliworker.watch(parentSessionId, workerId ?? '', combined)[Symbol.asyncIterator]();
      try {
        const first = await abortable(iterator.next(), combined);
        if (first.done) throw new Error('CLI Worker 连接已结束');
        return parseJson(first.value);
      } finally {
        controller.abort();
        closeIterator(iterator);
      }
    },

    /** List the parent session's live workers. */
    async listWorkers(parentSessionId, signal) {
      const snapshot = await this.snapshotOnce(parentSessionId, '', signal);
      return {
        workers: Array.isArray(snapshot?.workers) ? snapshot.workers : [],
        archivedWorkers: Array.isArray(snapshot?.archivedWorkers) ? snapshot.archivedWorkers : [],
      };
    },

    /** Start one follow-up turn on an existing worker. */
    async followup(parentSessionId, workerId, prompt, signal) {
      const cliworker = service();
      const value = await cliworker.followup(parentSessionId, workerId, prompt, signal);
      return parseJson(value);
    },

    /** Stop one worker and await cleanup. */
    async stop(parentSessionId, workerId) {
      const cliworker = service();
      return parseJson(await cliworker.stop(parentSessionId, workerId));
    },

    /** Raw watch stream used by the engine. */
    watch(parentSessionId, workerId, signal) {
      const cliworker = service();
      return cliworker.watch(parentSessionId, workerId ?? '', signal);
    },

    /** Read profile-wide CLI enablement (cheap; does not probe executables). */
    async cliSettings(parentSessionId, signal) {
      const cliworker = service();
      if (typeof cliworker.cliSettings !== 'function') return undefined;
      return parseJson(await cliworker.cliSettings(parentSessionId, signal));
    },

    activeStatus,
  };
}
