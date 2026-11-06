import { memberKey, verifyChild } from './members.js';
import { abortable, closeIterator } from './async.js';
import { timelineRunId } from './client-room.js';
import { createUserMessage } from './create-message.js';
import { MEMBER_TOOLS } from './member-protocol.js';
import { createCliWorkerAdapter, parseCliWorkerSnapshot, cliWorkerBusy, cliWorkerOutcome } from './adapter.js';

const active = (w) => ['queued', 'running', 'stopping'].includes(w?.status);

export function councilArchiveIssue(ctx, parentId, member) {
  const archived = ctx?.get?.('workspaceRegistry')?.archivedSessionIds ?? [];
  if (archived.includes(parentId)) return '议会主会话已归档，请恢复会话后再派发。';
  if (member?.kind === 'subagent' && archived.includes(member.sessionId)) {
    return `原生成员 ${member.name || member.sessionId} 已归档，请恢复该会话或移除成员后再派发。`;
  }
  return null;
}

/** Integrates room dispatch with documented activation and CLI submission receipts. */
export function createRoomHost({ ctx, adapter = createCliWorkerAdapter(ctx), config, nativeOptions }) {
  const nativeBindings = new Map();
  const nativeHandles = new Map();
  const jobClaims = new Map();
  const lifetime = new AbortController();
  let rooms;
  const agents = () => ctx.get('agents');
  const restrictedCli = new Map();
  function restrictCli(agent) {
    if (!agent || restrictedCli.has(agent) || !adapter.isAvailable()) return;
    const record = adapter.lookupConversation(agent.id);
    if (!record || !rooms?.flight(record.parentSessionId, record.workerId)) return;
    // Presentation and execution use the same scoped registry. Ordinary workers
    // retain their tools; council runs expose only messaging plus skill loading.
    restrictedCli.set(agent, { parentId: record.parentSessionId, dispose: agent.ctx.tools.restrict({ allow: MEMBER_TOOLS }) });
  }
  const host = {
    attach(service) {
      rooms = service;
      if (typeof ctx.on === 'function') ctx.on('agent/disposed', ({ agent }) => {
        for (const [id, entry] of nativeHandles) {
          if (entry.parent === agent) { nativeHandles.delete(id); void entry.handle.dispose().catch(() => {}); }
          else if (entry.handle.agent === agent) nativeHandles.delete(id);
        }
      });
      if (typeof ctx.on === 'function') {
        ctx.on('agent/created', ({ agent }) => restrictCli(agent));
        ctx.on('agent/pre-step', async ({ agent }, next) => { restrictCli(agent); return next(); });
      }
      const jobs = ctx.get('jobs');
      if (jobs?.events) ctx.effect(() => jobs.events.subscribe({ owners: 'scope' }, (event) => {
        if (event.type !== 'registered' || event.job.kind !== 'cliworker') return;
        const match = /\[council-delivery:([0-9a-f-]{36})\]/u.exec(event.job.label);
        const claim = match && jobClaims.get(match[1]);
        if (!claim || event.job.owner !== claim.parentId) return;
        // A synchronous registration listener installs a real SDK waiter before
        // settlement. event.awaited prevents tool-jobs waking the chair. Other
        // workers/jobs retain their normal completion notifications.
        claim.jobId = event.job.id;
        void jobs.wait(event.job.id, 86_400_000, claim.parentId, lifetime.signal).catch(() => {});
      }), 'council: collect owned CLI completions');
    },
    async release(parentId) {
      for (const [agent, restriction] of restrictedCli) {
        if (restriction.parentId === parentId) { restriction.dispose(); restrictedCli.delete(agent); }
      }
      for (const [id, entry] of nativeHandles) {
        if (entry.parent.id !== parentId) continue;
        if (entry.handle.agent.status !== 'idle') throw new Error('成员仍在运行，不能释放会话。');
        nativeHandles.delete(id);
        await entry.handle.dispose();
      }
    },
    async dispose() {
      lifetime.abort(); jobClaims.clear();
      for (const restriction of restrictedCli.values()) restriction.dispose();
      restrictedCli.clear();
      const entries = [...nativeHandles.values()]; nativeHandles.clear();
      await Promise.allSettled(entries.map((entry) => entry.handle.dispose()));
    },
    isParticipant(agent) {
      if (!agent || agents()?.get(agent.id) !== agent) return false;
      if (nativeBindings.has(agent.id)) return true;
      if (!adapter.isAvailable()) return false;
      const record = adapter.lookupConversation(agent.id);
      return !!record && !!rooms?.flight(record.parentSessionId, record.workerId);
    },
    isNative(agent) { return nativeBindings.has(agent?.id); },
    async identify(agent) {
      if (!agent || agents()?.get(agent.id) !== agent) throw new Error('需要真实的当前成员执行身份。');
      const native = nativeBindings.get(agent.id);
      if (native) {
        const flight = rooms.flight(native.parent.id, native.memberId);
        if (flight?.executionId !== agent.id || flight.deliveryId !== native.deliveryId) throw new Error('原生成员身份已过期。');
        return native;
      }
      const record = adapter.lookupConversation(agent.id);
      if (!record) throw new Error('该会话未绑定议会成员。');
      const parent = agents()?.get(record.parentSessionId);
      const flight = rooms.flight(record.parentSessionId, record.workerId);
      if (!parent || !flight) throw new Error('该 CLI 当前不在议会执行轮次中。');
      const worker = adapter.getWorker(parent.id, record.workerId);
      if (!flight.runId || worker.runId !== flight.runId || worker.harnessConversation?.sessionId !== agent.id || !active(worker)) throw new Error('CLI 工具桥的议会运行身份尚未确认或已过期。');
      return { parent, roomId: flight.roomId, memberId: record.workerId, deliveryId: flight.deliveryId };
    },
    async ready(parent, member) {
      const issue = councilArchiveIssue(ctx, parent.id, member);
      if (issue) throw new Error(issue);
      if (agents()?.get(parent.id) !== parent) return false;
      if (member.kind === 'subagent') {
        const child = agents()?.get(member.sessionId);
        // The SDK releases an initial READY activation on settlement. Do not race
        // its teardown or adopt an Agent whose lifetime belongs to another owner.
        return !child || (nativeHandles.get(member.sessionId)?.handle.agent === child && child.status === 'idle');
      }
      adapter.assertCompatible();
      const snapshot = await adapter.snapshotOnce(parent.id, member.workerId, AbortSignal.timeout(10000));
      const worker = snapshot.selected;
      if (!worker) throw new Error(`成员 ${member.name} 已不在当前会话中。`);
      return !cliWorkerBusy(snapshot);
    },
    async run({ parent, member, prompt, room, flight, accepted, signal }) {
      const issue = councilArchiveIssue(ctx, parent.id, member);
      if (issue) return { status: 'failed', error: issue };
      const lifetime = AbortSignal.any([signal, AbortSignal.timeout(config.roundTimeoutMs)]);
      if (member.kind === 'subagent') {
        await verifyChild(ctx, parent.id, member.sessionId, lifetime);
        const identity = { parent, roomId: room.id, memberId: memberKey(member), deliveryId: flight.deliveryId };
        nativeBindings.set(flight.executionId, identity);
        try {
          let entry = nativeHandles.get(member.sessionId);
          if (entry && agents().get(member.sessionId) !== entry.handle.agent) { nativeHandles.delete(member.sessionId); entry = undefined; }
          if (!entry) {
            const options = await nativeOptions(member.sessionId, lifetime, parent);
            const handle = await agents().resume({ resumeSessionId: member.sessionId, parentAgent: parent, ...options, signal: lifetime });
            entry = { handle, parent }; nativeHandles.set(member.sessionId, entry);
          }
          const child = entry.handle.agent;
          if (entry.parent !== parent || child.status !== 'idle') throw new Error('原生成员不在可接受新消息的空闲状态。');
          const start = child.session.seq;
          const message = createUserMessage({ content: [{ type: 'text', text: prompt }],
            source: { kind: 'council-inbox', roomId: room.id, deliveryId: flight.deliveryId } });
          lifetime.throwIfAborted();
          const issue = councilArchiveIssue(ctx, parent.id, member);
          if (issue) return { status: 'failed', error: issue };
          child.followup(message);
          await accepted({ executionId: child.id, messageId: message.id });
          try { await abortable(child.whenIdle(), lifetime); }
          catch (error) { child.cancel({ kind: 'user' }); await child.whenIdle(); throw error; }
          await ctx.get('sessions').flush(child.session);
          const events = child.session.snapshotEvents(start);
          const end = events.filter((e) => e.type === 'turn/end').at(-1);
          const reason = end?.data?.reason?.kind;
          const blocks = events.filter((e) => e.type === 'assistant/message').at(-1)?.data?.message?.content ?? [];
          return { status: reason === 'completed' ? 'completed' : ['aborted', 'interrupted'].includes(reason) ? 'cancelled' : 'failed',
            text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n'),
            ...reason === 'completed' ? {} : { error: `原生成员回合结束状态：${reason || '未确认'}` } };
        } finally {
          nativeBindings.delete(flight.executionId);
        }
      }
      let stream;
      const controller = new AbortController();
      const cliLifetime = AbortSignal.any([lifetime, controller.signal]);
      try {
        adapter.assertCompatible();
        // Watch is subscribed before submission; exact run id is the only completion key.
        stream = adapter.watch(parent.id, member.workerId, cliLifetime)[Symbol.asyncIterator]();
        const first = await abortable(stream.next(), cliLifetime);
        if (first.done) throw new Error('CLI Worker watch 已结束。');
        const initial = parseCliWorkerSnapshot(first.value), before = initial.selected;
        if (!before || before.id !== member.workerId) throw new Error('CLI Worker 未返回当前成员快照；已停止派发。');
        if (cliWorkerBusy(initial)) return { status: 'uncertain', error: '成员在派发前已被其它操作占用，请核对后重试。' };
        if (!ctx.get('jobs')?.events) throw new Error('缺少可收集 CLI 完成信号的 jobs 服务。');
        const binding = adapter.getWorker(parent.id, member.workerId)?.harnessConversation;
        if (binding) restrictCli(agents()?.get(binding.sessionId));
        const issue = councilArchiveIssue(ctx, parent.id, member);
        if (issue) return { status: 'failed', error: issue };
        jobClaims.set(flight.deliveryId, { parentId: parent.id });
        const receipt = await adapter.submitMessage(parent.id, member.workerId, {
          id: flight.deliveryId, clientId: room.epoch, sequence: room.deliveries.length,
          prompt: `[council-delivery:${flight.deliveryId}]\n${prompt}`, mode: 'queue', intent: 'direct', expectedRunId: before?.runId || 'none',
        }, cliLifetime);
        await accepted({ runId: receipt.runId });
        for (;;) {
          const next = await abortable(stream.next(), cliLifetime);
          if (next.done) throw new Error('CLI Worker watch 在完成前断开。');
          const snapshot = parseCliWorkerSnapshot(next.value), selected = snapshot.selected;
          if (selected?.runId !== receipt.runId) {
            if (selected?.runId === before?.runId) continue;
            throw new Error('成员已切换到其它执行轮次，请核对议会投递。');
          }
          if (cliWorkerBusy(snapshot)) continue;
          const rows = (snapshot.timeline ?? []).filter((row) => timelineRunId(row) === receipt.runId);
          const result = rows.filter((row) => row.kind === 'result' && row.text?.trim()).at(-1)?.text;
          const text = result || rows.filter((row) => row.kind === 'assistant').map((row) => row.text || '').join('\n');
          return { status: cliWorkerOutcome(selected.status), text, error: selected.error || '' };
        }
      } finally { controller.abort(); jobClaims.delete(flight.deliveryId); closeIterator(stream); }
    },
  };
  return host;
}
