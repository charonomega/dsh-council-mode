/** Discussion and assignment orchestration over the CLI Worker adapter. */

import { randomUUID } from 'node:crypto';
import { ROLE_BY_ID } from './catalog.js';
import {
  buildAssignmentPrompt,
  buildAssignmentReport,
  buildConveneDigest,
  buildDiscussionPrompt,
  buildRelayPrompt,
} from './prompt.js';
import { createRelayLog } from './relay-log.js';
import { timelineRunId } from './client-room.js';
import { abortable, closeIterator } from './async.js';
import { memberKey, resolveMember, verifyChild, subagentService, effectivePermission, canonicalScope, scopesOverlap } from './members.js';
import { parseCliWorkerSnapshot, cliWorkerBusy, cliWorkerOutcome } from './adapter.js';
import { councilArchiveIssue } from './room-host.js';

function roleOf(member) {
  return (
    ROLE_BY_ID[member.roleId] ?? {
      id: member.roleId,
      name: member.roleName || member.roleId || '成员',
      summary: member.roleSummary || '',
      prompt: member.rolePrompt || '',
      readOnly: member.readOnly === true,
    }
  );
}

function marker() {
  return randomUUID().replace(/-/g, '').slice(0, 10);
}

function slice(text, limit) {
  const value = String(text ?? '');
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function parseSnapshot(value) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  return value;
}

function memberWorker(snapshot, workerId) {
  return (snapshot?.workers ?? []).find((worker) => worker.id === workerId);
}

function timelineText(snapshot, runId) {
  const timeline = Array.isArray(snapshot?.timeline) ? snapshot.timeline : [];
  const items = timeline.filter((item) => timelineRunId(item) === runId);
  const results = items
    .filter((item) => item.kind === 'result' && typeof item.text === 'string' && item.text.trim() !== '')
    .map((item) => item.text.trim());
  if (results.length > 0) return results[results.length - 1];
  const assistants = items
    .filter((item) => item.kind === 'assistant' && typeof item.text === 'string' && item.text.trim() !== '')
    .map((item) => item.text.trim());
  return assistants.join('\n').trim();
}

function workerError(snapshot, fallback) {
  const worker = snapshot?.selected;
  return worker?.error || snapshot?.error || fallback;
}

/**
 * @param {object} options
 * @param {ReturnType<import('./adapter.js').createCliWorkerAdapter>} options.adapter
 * @param {ReturnType<import('./config.js').resolveConfig>} options.config
 */
export function createCouncilEngine({ adapter, config, ctx, relayLog }) {
  const log = relayLog ?? createRelayLog();
  const inFlightDeliveries = new Set();

  function assertSessionsActive(parentSessionId, members) {
    const parentIssue = councilArchiveIssue(ctx, parentSessionId);
    if (parentIssue) throw new Error(parentIssue);
    for (const member of members) {
      const issue = councilArchiveIssue(ctx, parentSessionId, member);
      if (issue) throw new Error(issue);
    }
  }

  /**
   * Send one prompt, wait for the matching run to finish, and return its reply.
   */
  async function runMemberTurn({ parentSessionId, member, prompt, signal, timeoutMs, limit }) {
    const mark = marker();
    const timeout = AbortSignal.timeout(timeoutMs);
    const combined = AbortSignal.any([signal, timeout]);
    const controller = new AbortController();
    const lifetime = AbortSignal.any([combined, controller.signal]);
    let stream, targetRun = '', dispatching = false;
    const info = { workerId: member.workerId, name: member.name || member.workerId, cli: '', roleName: roleOf(member).name };
    try {
      assertSessionsActive(parentSessionId, [member]);
      const live = await abortable(adapter.listWorkers(parentSessionId, lifetime), lifetime);
      const worker = live.workers.find((item) => item.id === member.workerId);
      if (!worker) throw new Error('成员不在当前会话的 CLI Worker 列表中（可能已被删除）');
      info.name = member.name || worker.agentName || info.name;
      info.cli = worker.preference?.cli ?? '';
      stream = adapter.watch(parentSessionId, member.workerId, lifetime)[Symbol.asyncIterator]();
      const first = await abortable(stream.next(), lifetime);
      if (first.done) throw new Error('CLI Worker 连接已结束');
      const initial = parseCliWorkerSnapshot(first.value);
      if (initial.selected?.id !== member.workerId) throw new Error('CLI Worker 未返回当前成员快照；已停止派发。');
      if (cliWorkerBusy(initial)) throw new Error('CLI Worker 仍在准备、运行或清理当前轮，请稍后派发。');
      combined.throwIfAborted();
      assertSessionsActive(parentSessionId, [member]);
      dispatching = true;
      const receipt = parseSnapshot(await abortable(adapter.followup(parentSessionId, member.workerId, prompt(mark), lifetime), lifetime));
      targetRun = typeof receipt?.runId === 'string' ? receipt.runId : '';
      while (true) {
        const next = await abortable(stream.next(), lifetime);
        if (next.done) throw new Error('CLI Worker 连接已结束');
        const snapshot = parseCliWorkerSnapshot(next.value);
        // Old adapters may omit the receipt id; only an exact marker can bind it.
        if (!targetRun) {
          const row = (snapshot.timeline ?? []).find((item) => item.kind === 'user' && item.text?.includes(`[council:${mark}]`));
          targetRun = row ? timelineRunId(row) : '';
        }
        const selected = snapshot.selected;
        if (!targetRun || selected?.runId !== targetRun || cliWorkerBusy(snapshot)) continue;
        const reply = timelineText(snapshot, targetRun);
        const ok = selected.status === 'completed' && !!reply;
        const status = selected.status === 'completed' && !reply ? 'failed' : cliWorkerOutcome(selected.status);
        return { ...info, ok, status, runId: targetRun, text: slice(reply, limit), truncated: reply.length > limit,
          error: ok ? '' : workerError(snapshot, selected.status === 'completed' ? '本轮没有可读回复' : `成员状态：${selected.status}`) };
      }
    } catch (error) {
      // The worker API has no atomic stop-if-run-id. Never stop a newer run by worker id.
      return { ...info, ok: false, status: dispatching ? 'uncertain' : signal.aborted ? 'cancelled' : 'failed', runId: targetRun, text: '',
        error: timeout.aborted ? '超时未回复（未确认是否完成；请查看成员会话，不要盲目重发）' : signal.aborted ? '等待已取消；已投递的 Worker 可能仍在运行，请在成员面板核对后停止。' : String(error?.message ?? error) };
    } finally {
      controller.abort();
      closeIterator(stream);
    }
  }

  async function runAll({ parentSessionId, members, prompts, signal, timeoutMs, limit }) {
    const settled = await Promise.allSettled(
      members.map((member, index) =>
        runMemberTurn({
          parentSessionId,
          member,
          prompt: prompts[index],
          signal,
          timeoutMs,
          limit,
        }),
      ),
    );
    if (signal.aborted) throw signal.reason ?? new Error('aborted');
    return settled.map((item, index) =>
      item.status === 'fulfilled'
        ? item.value
        : {
            ok: false,
            text: '',
            error: item.reason instanceof Error ? item.reason.message : String(item.reason),
            workerId: members[index].workerId,
            name: members[index].name,
            roleName: roleOf(members[index]).name,
            cli: '',
          },
    );
  }

  return {
    /**
     * Relay only new council content. The host numbers each message, keeps a
     * per-member delivery cursor, and automatically retries anything a member
     * has not received. Replies stream into the council room; this call does
     * not wait for replies, add round goals, or produce a digest.
     */
    async relay({ parentSessionId, parentAgent, members, message, messageId, signal }) {
      if (!members?.length) throw new Error('议会还没有成员；先登记议员。');
      assertSessionsActive(parentSessionId, members);
      const text = String(message ?? '').trim();
      const entry = text ? await log.append(parentSessionId, text, {
        messageId, authorId: parentAgent?.id ?? parentSessionId, recipients: members.map(memberKey),
      }) : undefined;
      const combined = AbortSignal.any([signal, AbortSignal.timeout(110000)]);
      const results = await Promise.allSettled(members.map(async (member) => {
        const key = memberKey(member);
        const uncertain = log.uncertain(parentSessionId, key);
        if (uncertain.length) throw new Error(`消息 #${uncertain[0].seq} 的送达状态不确定；请核对成员会话后由用户执行 /council resolve <序号> <成员id> received|retry；禁止自动重复投递。`);
        const pending = log.pending(parentSessionId, key);
        if (!pending.length) return 0;
        const mark = marker(), batch = [];
        for (const item of pending) {
          if (buildRelayPrompt({ entries: [...batch, item], marker: mark }).length > 12000) break;
          batch.push(item);
        }
        if (!batch.length) throw new Error('消息及元数据超过投递上限；原消息已保留。');
        if (member.kind === 'subagent') {
          if (!parentAgent) throw new Error('原生子智能体转达需要主对话 Agent。');
          await verifyChild(ctx, parentSessionId, member.sessionId, combined);
        }
        combined.throwIfAborted();
        assertSessionsActive(parentSessionId, [member]);
        // Write ahead of dispatch: after a crash, sending is uncertain, never pending.
        await log.mark(parentSessionId, key, batch, 'sending');
        const flightKey = `${parentSessionId}:${key}`;
        inFlightDeliveries.add(flightKey);
        let dispatching = false;
        try {
          const prompt = buildRelayPrompt({ entries: batch, marker: mark });
          assertSessionsActive(parentSessionId, [member]);
          dispatching = true;
          const receipt = member.kind === 'subagent'
            ? await abortable(subagentService(ctx).sendMessage(parentAgent, member.sessionId, [{ type: 'text', text: prompt }], { signal: combined }), combined)
            : await abortable(adapter.followup(parentSessionId, member.workerId, prompt, combined), combined);
          await log.mark(parentSessionId, key, batch, 'delivered', typeof receipt === 'string' ? receipt : JSON.stringify(receipt ?? null));
          return batch.length;
        } catch (error) {
          const reason = String(error?.message ?? error);
          // A local pre-dispatch failure or this exact CLI rejection precedes admission.
          const rejected = !dispatching || reason.includes('请等待任务结束并完成进程清理后再管理此任务');
          await log.mark(parentSessionId, key, batch, rejected ? 'pending' : 'uncertain', '', reason);
          throw new Error(rejected ? reason : `${reason}；送达状态不确定，不会自动重发`);
        } finally {
          inFlightDeliveries.delete(flightKey);
        }
      }));
      const lines = [entry ? entry.duplicate ? `消息 #${entry.seq} 的同一 message_id 已记录，忽略重复。` : `已记录议会消息 #${entry.seq}。` : '本次没有新增消息。'];
      const delivered = results.filter((item) => item.status === 'fulfilled' && item.value > 0).length;
      lines.push(`已投递 ${delivered}/${members.length} 位成员。投递回执不代表任务完成。`);
      results.forEach((item, index) => { if (item.status === 'rejected') lines.push(`未送达：${members[index].name}：${item.reason.message}`); });
      if (!delivered && results.every((item) => item.status === 'fulfilled')) lines.push('所选成员已是最新。');
      const pending = members.filter((member) => log.pending(parentSessionId, memberKey(member)).length);
      if (pending.length) lines.push(`剩余待投递：${pending.map((member) => member.name).join('、')}；省略 message 可继续有界投递。`);
      return lines.join('\n');
    },

    async resolveDelivery({ parentSessionId, memberId, seq, resolution }) {
      if (inFlightDeliveries.has(`${parentSessionId}:${memberId}`)) throw new Error('该成员仍在投递中；请等待投递结束后再核对。');
      const entry = log.uncertain(parentSessionId, memberId).find((item) => item.seq === seq);
      if (!entry) throw new Error('未找到该成员的未确认消息；只能处理 uncertain/sending 记录。');
      if (resolution !== 'received' && resolution !== 'retry') throw new Error('resolution 必须为 received 或 retry。');
      await log.mark(parentSessionId, memberId, [entry], resolution === 'received' ? 'delivered' : 'pending',
        'user-resolution', resolution === 'received' ? '用户核对后确认已收到' : '用户核对后明确要求重试');
      return resolution === 'received' ? '已记录用户确认收到；后续消息可以继续投递。' : '已改为待投递；下次省略 message 调用 council_convene 可重试。';
    },

    pendingMembers(parentSessionId, members) {
      return (members ?? []).filter((member) => log.pending(parentSessionId, memberKey(member)).length > 0).map((member) => member.name);
    },

    /**
     * Run the debate rounds and return the bounded digest text.
     */
    async convene({ parentSessionId, members, topic, rounds, focus, signal }) {
      if (!Array.isArray(members) || members.length === 0) {
        throw new Error('议会还没有成员；先邀请 CLI Worker 并调用 council_enroll 登记。');
      }
      assertSessionsActive(parentSessionId, members);
      const effectiveRounds = Math.max(1, Math.min(config.maxRounds, rounds ?? config.maxRounds));
      const limit = config.statementLimit;

      const round1Prompts = members.map((member) => (mark) =>
        buildDiscussionPrompt({
          topic,
          focus,
          round: 1,
          rounds: effectiveRounds,
          member,
          role: roleOf(member),
          prior: [],
          ownPrevious: '',
          marker: mark,
        }),
      );
      let results = await runAll({
        parentSessionId,
        members,
        prompts: round1Prompts,
        signal,
        timeoutMs: config.roundTimeoutMs,
        limit,
      });

      if (effectiveRounds >= 2) {
        const successful = results
          .map((result, index) => ({ result, member: members[index], index }))
          .filter((entry) => entry.result.ok);
        if (successful.length > 1) {
          const prior = successful.map(
            (entry) => `${entry.result.name}（${entry.result.roleName}）：${slice(entry.result.text, 600)}`,
          );
          const round2 = await runAll({
            parentSessionId,
            members: successful.map((entry) => entry.member),
            prompts: successful.map((entry, index) => (mark) =>
              buildDiscussionPrompt({
                topic,
                focus,
                round: 2,
                rounds: effectiveRounds,
                member: entry.member,
                role: roleOf(entry.member),
                prior: prior.filter((_, priorIndex) => priorIndex !== index),
                ownPrevious: slice(entry.result.text, 600),
                marker: mark,
              }),
            ),
            signal,
            timeoutMs: config.roundTimeoutMs,
            limit,
          });
          for (let i = 0; i < successful.length; i += 1) {
            const original = results[successful[i].index];
            const second = round2[i];
            if (second.ok) {
              results[successful[i].index] = { ...second, name: original.name, cli: original.cli };
            } else {
              results[successful[i].index] = {
                ...original,
                error: `${original.error ? `${original.error}; ` : ''}第 2 轮：${second.error}`,
              };
            }
          }
        }
      }

      if (effectiveRounds >= 3) {
        const successful = results
          .map((result, index) => ({ result, member: members[index], index }))
          .filter((entry) => entry.result.ok);
        if (successful.length > 1) {
          const prior = successful.map(
            (entry) => `${entry.result.name}（${entry.result.roleName}）：${slice(entry.result.text, 500)}`,
          );
          const round3 = await runAll({
            parentSessionId,
            members: successful.map((entry) => entry.member),
            prompts: successful.map((entry) => (mark) =>
              `[council:${mark}]\n议会讨论 · 第 3/3 轮\n议题：${topic}\n其他成员最终立场：\n${prior
                .map((line) => `- ${line}`)
                .join('\n')}\n请只输出一行表决：支持 / 反对 / 保留，并附一句理由。不要修改工作区。`,
            ),
            signal,
            timeoutMs: config.roundTimeoutMs,
            limit,
          });
          for (let i = 0; i < successful.length; i += 1) {
            const second = round3[i];
            if (second.ok) {
              results[successful[i].index] = {
                ...results[successful[i].index],
                text: second.text,
                truncated: second.truncated,
              };
            }
          }
        }
      }

      return buildConveneDigest({
        topic,
        rounds: effectiveRounds,
        results: results.map((result) => ({ ...result, limit: config.statementLimit })),
        limit: config.maxDigestChars,
      });
    },

    /**
     * Run work orders and return the bounded report text.
     */
    async assign({ parentSessionId, parentAgent, members, assignments, signal }) {
      if (!assignments?.length || assignments.length > 6) throw new Error('一次需分配 1–6 个任务。');
      assertSessionsActive(parentSessionId, []);
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(config.assignmentTimeoutMs)]);
      const live = members.some((member) => member.kind !== 'subagent')
        ? await abortable(adapter.listWorkers(parentSessionId, deadline), deadline) : { workers: [] };
      const resolved = [], scopes = [], assigned = new Set();
      const cwd = parentAgent?.session?.header?.cwd ?? process.cwd();
      for (const assignment of assignments) {
        const member = resolveMember(members, assignment.member, live.workers);
        assertSessionsActive(parentSessionId, [member]);
        if (assigned.has(memberKey(member))) throw new Error('一次不能给同一成员分配多个并行任务。');
        assigned.add(memberKey(member));
        const native = member.kind === 'subagent';
        const worker = live.workers.find((worker) => worker.id === member.workerId);
        if (!native && !worker) throw new Error(`成员 "${member.name}" 的 CLI Worker 已不在当前会话中。`);
        const verified = native ? await verifyChild(ctx, parentSessionId, member.sessionId, deadline) : undefined;
        const permission = effectivePermission(worker, verified?.child);
        const role = roleOf(member);
        const writeScope = String(assignment.write_scope ?? '').trim();
        if (writeScope && (role.readOnly || permission === 'read-only')) throw new Error(`成员 "${member.name}" 是只读成员，不能带 write_scope。`);
        if (!writeScope && permission !== 'read-only') throw new Error(`成员 "${member.name}" 未启用可验证的只读执行模式；请先以 read_only/只读沙箱创建成员。角色提示词不能代替权限。`);
        if (writeScope) {
          if (permission !== 'writable') throw new Error(`成员 "${member.name}" 的实际写权限未核验。`);
          const normalized = canonicalScope(writeScope, cwd);
          const other = scopes.find((item) => scopesOverlap(item.path, normalized));
          if (other) throw new Error(`写入范围重复或重叠：${writeScope} 与 ${other.member} 的范围冲突。`);
          scopes.push({ path: normalized, member: member.name });
        }
        resolved.push({ member, native, role, assignment });
      }
      assertSessionsActive(parentSessionId, resolved.map(({ member }) => member));
      const results = await Promise.all(resolved.map(async ({ member, native, role, assignment }) => {
        let result;
        if (!native) result = await runMemberTurn({ parentSessionId, member, signal: deadline,
          timeoutMs: config.assignmentTimeoutMs, limit: config.statementLimit,
          prompt: (mark) => buildAssignmentPrompt({ member, role, assignment, marker: mark }) });
        else {
          let dispatching = false;
          try {
            if (!parentAgent) throw new Error('原生子智能体任务需要主对话 Agent。');
            deadline.throwIfAborted();
            assertSessionsActive(parentSessionId, [member]);
            dispatching = true;
            const receipt = await abortable(subagentService(ctx).sendMessage(parentAgent, member.sessionId,
              [{ type: 'text', text: buildAssignmentPrompt({ member, role, assignment, marker: marker() }) }], { signal: deadline }), deadline);
            result = { ok: true, status: 'accepted', receipt, text: '任务已接受；尚未验证完成，回复请查看成员会话。' };
          } catch (error) { result = { ok: false, status: dispatching ? 'uncertain' : 'failed', error: String(error?.message ?? error), text: '' }; }
        }
        return { ...result, memberId: memberKey(member), member: assignment.member, name: member.name, roleName: role.name, task: assignment.task };
      }));
      return JSON.stringify({ results, report: buildAssignmentReport({ results, limit: config.maxDigestChars }) });
    },
  };
}
