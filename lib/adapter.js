import { abortable, closeIterator } from './async.js';
/** Thin, testable wrapper around the installed CLI Worker Host service. */

function parseJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error('CLI Worker 返回了无效 JSON；请核对插件兼容性。');
  }
}

const workerStatuses = new Set(['queued', 'running', 'stopping', 'completed', 'failed', 'interrupted', 'cancelled', 'uncertain']);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function activeStatus(status) {
  return status === 'queued' || status === 'running' || status === 'stopping';
}

/** Both supported releases expose these capabilities; fail before admission if one disappears. */
export function cliWorkerCompatibilityIssue(cliworker) {
  if (!cliworker) return '未检测到可用的 CLI Worker 服务；请先启用 dsh-cliworker-now。';
  const methods = [
    ['watch', cliworker.watch], ['followup', cliworker.followup], ['submitMessage', cliworker.submitMessage],
    ['runtime.get', cliworker.runtime?.get], ['harnessConversation.lookup', cliworker.harnessConversation?.lookup],
  ];
  const missing = methods.filter(([, method]) => typeof method !== 'function').map(([name]) => name);
  return missing.length ? `CLI Worker 缺少议会所需接口 ${missing.join('、')}；已停止派发，请核对兼容版本。` : null;
}

/** Accept object and JSON wire snapshots while validating the fields Council consumes. */
export function parseCliWorkerSnapshot(value) {
  const snapshot = parseJson(value);
  if (!record(snapshot) || (!Array.isArray(snapshot.workers) && !record(snapshot.selected))) {
    throw new Error('CLI Worker 快照缺少成员列表或选中成员；请核对插件兼容性。');
  }
  if ((snapshot.workers !== undefined && !Array.isArray(snapshot.workers)) ||
      (snapshot.archivedWorkers !== undefined && !Array.isArray(snapshot.archivedWorkers)) ||
      (snapshot.timeline !== undefined && !Array.isArray(snapshot.timeline)) ||
      (snapshot.selectedBusy !== undefined && typeof snapshot.selectedBusy !== 'boolean')) {
    throw new Error('CLI Worker 快照字段格式无效；请核对插件兼容性。');
  }
  if (snapshot.selected !== undefined) {
    const worker = snapshot.selected;
    if (!record(worker) || typeof worker.id !== 'string' || typeof worker.runId !== 'string' || !workerStatuses.has(worker.status)) {
      throw new Error('CLI Worker 选中成员身份或状态无法确认；请核对插件兼容性。');
    }
  }
  return snapshot;
}

/** Preparation and cleanup can outlive a run's visible status. Older snapshots omit selectedBusy. */
export function cliWorkerBusy(snapshot) {
  return snapshot?.selectedBusy === true || activeStatus(snapshot?.selected?.status);
}

export function cliWorkerOutcome(status) {
  if (status === 'completed' || status === 'failed' || status === 'uncertain') return status;
  if (status === 'interrupted' || status === 'cancelled') return 'cancelled';
  return 'uncertain';
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function createCliWorkerAdapter(ctx) {
  function service() {
    const cliworker = ctx.get('cliworker');
    const issue = cliWorkerCompatibilityIssue(cliworker);
    if (issue) throw new Error(issue);
    return cliworker;
  }

  return {
    compatibilityIssue() { return cliWorkerCompatibilityIssue(ctx.get('cliworker')); },
    assertCompatible() { service(); },
    isAvailable() {
      return this.compatibilityIssue() === null;
    },

    /** Read the first snapshot of one watch stream. */
    async snapshotOnce(parentSessionId, workerId, signal) {
      const controller = new AbortController();
      const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
      const iterator = this.watch(parentSessionId, workerId ?? '', combined)[Symbol.asyncIterator]();
      try {
        const first = await abortable(iterator.next(), combined);
        if (first.done) throw new Error('CLI Worker 连接已结束');
        return first.value;
      } finally {
        controller.abort();
        closeIterator(iterator);
      }
    },

    /** List the parent session's live workers. */
    async listWorkers(parentSessionId, signal) {
      const snapshot = await this.snapshotOnce(parentSessionId, '', signal);
      if (!Array.isArray(snapshot.workers)) throw new Error('CLI Worker 快照缺少成员列表；请核对插件兼容性。');
      return {
        workers: snapshot.workers,
        archivedWorkers: snapshot.archivedWorkers ?? [],
      };
    },

    /** Start one follow-up turn on an existing worker. */
    async followup(parentSessionId, workerId, prompt, signal) {
      const cliworker = service();
      const value = await abortable(cliworker.followup(parentSessionId, workerId, prompt, signal), signal);
      return parseJson(value);
    },

    /** Stable click identity is passed through unchanged; this method never retries admission. */
    async submitMessage(parentSessionId, workerId, request, signal) {
      const cliworker = service();
      const receipt = parseJson(await abortable(cliworker.submitMessage(parentSessionId, workerId, JSON.stringify(request), signal), signal));
      if (!record(receipt) || typeof receipt.runId !== 'string' || !receipt.runId ||
          (receipt.workerId !== undefined && receipt.workerId !== workerId)) {
        throw new Error('CLI 未返回可核验的 runId/成员回执；不会自动重发。');
      }
      return receipt;
    },

    /** These private bridge capabilities are kept at this one checked boundary. */
    lookupConversation(sessionId) { return service().harnessConversation.lookup(sessionId); },
    getWorker(parentSessionId, workerId) { return service().runtime.get(parentSessionId, workerId); },

    /** Stop one worker and await cleanup. */
    async stop(parentSessionId, workerId) {
      const cliworker = service();
      return parseJson(await cliworker.stop(parentSessionId, workerId));
    },

    /** Validated watch stream used by the engine and room scheduler. */
    async *watch(parentSessionId, workerId, signal) {
      const cliworker = service();
      const stream = cliworker.watch(parentSessionId, workerId ?? '', signal);
      if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') throw new Error('CLI Worker watch 未返回异步快照流。');
      for await (const value of stream) {
        const snapshot = parseCliWorkerSnapshot(value);
        if (workerId && snapshot.selected && snapshot.selected.id !== workerId) throw new Error('CLI Worker 快照成员与请求不一致。');
        yield snapshot;
      }
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
