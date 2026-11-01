/** Model-facing council tools. */

import { randomUUID } from 'node:crypto';
import { resolveMember, verifyChild, effectivePermission } from './members.js';
import { defineTool } from './define-tool.js';
import { CLIS, CLI_IDS, ROLE_BY_ID, ROLES, ROLE_IDS_TEXT } from './catalog.js';
import { emptyCouncilState, COUNCIL_PROJECTION_KEY } from './projection.js';

const output = {
  schema: { type: 'string' },
  render: (_args, value) => [{ type: 'text', text: String(value ?? '') }],
};

function stateOf(ctx, agent) {
  try {
    return ctx.sessionProjections.stateOf(agent.session, COUNCIL_PROJECTION_KEY) ?? emptyCouncilState();
  } catch {
    return emptyCouncilState();
  }
}

function assertMain(agent) {
  if (agent.session.header.origin === 'subagent') {
    throw new Error('议会模式仅用于主对话，不能用于子会话。');
  }
}

/** Return the reason this agent cannot dispatch council work, or null. */
export function councilDispatchIssue(agent) {
  if (agent.session.header.origin === 'subagent') {
    return '议会模式仅用于主对话，不能用于子会话。';
  }
  const plan = agent.ctx.get('planMode');
  if (plan?.get(agent)?.active) {
    return '议会模式与计划模式不能同时派遣；请先退出计划模式（/plan off）。';
  }
  const sandbox = agent.ctx.get('sandboxPolicy');
  if (sandbox?.resolve({ session: agent.session })?.mode === 'read-only') {
    return '议会模式需要可写会话；当前沙箱为只读，请先明确切换项目权限。';
  }
  return null;
}

function assertDispatchAllowed(agent) {
  const issue = councilDispatchIssue(agent);
  if (issue !== null) throw new Error(issue);
}

function assertActive(state) {
  if (!state.active) {
    throw new Error('议会模式未开启；先调用 /council on（或点击输入框左侧的「议会」）。');
  }
}

function parseAssignments(value) {
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch (error) {
      throw new Error(`assignments 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!Array.isArray(list)) throw new Error('assignments 必须是数组。');
  if (list.length === 0) throw new Error('assignments 不能为空。');
  if (list.length > 6) throw new Error('一次最多分配 6 个任务。');
  return list.map((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`assignments[${index}] 必须是对象。`);
    }
    if (typeof item.member !== 'string' || item.member.trim() === '') {
      throw new Error(`assignments[${index}].member 必须是非空字符串。`);
    }
    if (typeof item.task !== 'string' || item.task.trim() === '') {
      throw new Error(`assignments[${index}].task 必须是非空字符串。`);
    }
    return {
      member: item.member.trim(),
      task: item.task.trim(),
      acceptance: typeof item.acceptance === 'string' ? item.acceptance.trim() : '',
      write_scope: typeof item.write_scope === 'string' ? item.write_scope.trim() : '',
      reason: typeof item.reason === 'string' ? item.reason.trim() : '',
    };
  });
}

function selectedMembers(state, text, workers = []) {
  if (typeof text !== 'string' || text.trim() === '') return state.members;
  const keys = text
    .split(/[,，]/u)
    .map((item) => item.trim())
    .filter(Boolean);
  if (keys.length === 0) return state.members;
  const chosen = [];
  const missing = [];
  for (const key of keys) {
    const member = resolveMember(state.members, key, workers);
    if (member && !chosen.includes(member)) chosen.push(member);
    else if (!member) missing.push(key);
  }
  if (missing.length > 0) {
    throw new Error(
      `未找到成员：${missing.join(', ')}。可用成员：${state.members.map((item) => item.name).join(', ') || '（无）'}`,
    );
  }
  return chosen;
}

function displayName(raw, fallback) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value === '') return fallback;
  if (value.length > 80) throw new Error('display_name 不能超过 80 个字符。');
  if (/[\u0000-\u001f\u007f]/u.test(value)) throw new Error('display_name 不能包含控制字符。');
  return value;
}

/**
 * @param {object} options
 * @param {import('@deepseek-ai/cordis').Context} options.ctx
 * @param {ReturnType<import('./config.js').resolveConfig>} options.config
 * @param {ReturnType<import('./adapter.js').createCliWorkerAdapter>} options.adapter
 * @param {ReturnType<import('./engine.js').createCouncilEngine>} options.engine
 */
export function createCouncilTools({ ctx, config, adapter, engine, rooms, host }) {
  const busySessions = new Set();

  function guard(parentSessionId) {
    if (busySessions.has(parentSessionId)) {
      throw new Error('上一轮议会讨论或任务分配尚未结束；请等待完成或先停止。');
    }
    busySessions.add(parentSessionId);
    return () => busySessions.delete(parentSessionId);
  }

  const roster = defineTool({
    name: 'council_roster',
    description:
      'Read the council roster: enrolled members with their council role, CLI, model, mode, status, and write permission, plus CLI Workers in this session that are not enrolled. Set include_available to also read profile-wide CLI enablement.',
    parameters: {
      include_available: {
        type: 'boolean',
        description: 'Also return profile-wide CLI enablement (does not probe whether executables are installed).',
      },
    },
    output,
    isConcurrencySafe: () => true,
    execute: async (args, exec) => {
      const agent = exec.agent;
      if (!agent) throw new Error('council_roster 需要主对话 Agent。');
      assertMain(agent);
      const state = stateOf(ctx, agent);
      let live = { workers: [], archivedWorkers: [] };
      try {
        live = await adapter.listWorkers(agent.id, exec.signal);
      } catch {
        /* roster still readable without CLI Worker; members show as missing */
      }
      const byId = new Map(live.workers.map((worker) => [worker.id, worker]));
      const memberIds = new Set(state.members.map((member) => member.workerId));
      const members = state.members.map((member) => {
        const worker = byId.get(member.workerId);
        const native = member.kind === 'subagent';
        return {
          kind: native ? 'subagent' : 'cliworker',
          workerId: member.workerId,
          agentId: member.agentId,
          sessionId: member.sessionId,
          name: member.name,
          liveName: worker?.agentName || '',
          roleId: member.roleId,
          roleName: member.roleName,
          roleSummary: member.roleSummary,
          readOnly: effectivePermission(worker, native ? ctx.get('agents')?.get(member.sessionId) : undefined) === 'read-only',
          roleReadOnly: ROLE_BY_ID[member.roleId]?.readOnly === true,
          effectivePermission: effectivePermission(worker, native ? ctx.get('agents')?.get(member.sessionId) : undefined),
          cli: native ? 'deepseek' : worker?.preference?.cli ?? '',
          cliLabel: native ? 'DeepSeek 子智能体' : CLIS[worker?.preference?.cli]?.label ?? '',
          model: native ? member.model || '' : worker?.preference?.model ?? '',
          effort: native ? '—' : worker?.preference?.effort ?? '',
          mode: native ? 'native' : worker?.mode ?? 'missing',
          status: native ? (member.verifiedParentId === agent.id ? 'enrolled' : 'unverified') : worker?.status ?? 'missing',
          nativeRole: native ? 'DeepSeek 原生子智能体' : worker?.role?.name ?? '',
        };
      });
      const unenrolled = live.workers
        .filter((worker) => !memberIds.has(worker.id))
        .map((worker) => ({
          workerId: worker.id,
          name: worker.agentName ?? worker.id,
          cli: worker.preference?.cli ?? '',
          cliLabel: CLIS[worker.preference?.cli]?.label ?? '',
          model: worker.preference?.model ?? '',
          mode: worker.mode,
          status: worker.status,
          nativeRole: worker.role?.name ?? '',
        }));
      const payload = {
        active: state.active,
        phase: state.phase,
        topic: state.topic,
        roles: ROLES.map((role) => ({
          id: role.id, name: role.name, summary: role.summary, roleReadOnly: role.readOnly,
        })),
        members,
        unenrolled,
      };
      if (args.include_available === true) {
        try {
          payload.cliSettings = await adapter.cliSettings(agent.id, exec.signal);
        } catch (error) {
          payload.cliSettings = { error: error instanceof Error ? error.message : String(error) };
        }
      }
      return JSON.stringify(payload);
    },
  });

  const enroll = defineTool({
    name: 'council_enroll',
    description:
      'Enroll an existing CLI Worker or a native DSH child agent of this session in the council under one council role. Use worker_id from cliworker_start, or agent_id/session_id of a continuable native subagent. Re-enrolling the same member updates its council role.',
    parameters: {
      worker_id: {
        type: 'string',
        description: 'Exact CLI Worker id for this parent session.',
      },
      agent_id: {
        type: 'string',
        description: 'Native DSH child agent id (continuable subagent) for this parent session.',
      },
      session_id: {
        type: 'string',
        description: 'Native DSH child session id; alternative to agent_id.',
      },
      role_id: {
        type: 'string',
        required: true,
        description: `Council role id. One of: ${ROLE_IDS_TEXT}.`,
      },
      display_name: {
        type: 'string',
        description: 'Optional display name in the room; defaults to the Worker/child name.',
      },
    },
    output,
    isConcurrencySafe: () => false,
    execute: async (args, exec) => {
      const agent = exec.agent;
      if (!agent) throw new Error('council_enroll 需要主对话 Agent。');
      assertMain(agent);
      const state = stateOf(ctx, agent);
      assertActive(state);
      const role = ROLE_BY_ID[args.role_id];
      if (!role) throw new Error(`未知议会角色 "${args.role_id}"；可用：${ROLE_IDS_TEXT}`);
      const workerId = typeof args.worker_id === 'string' ? args.worker_id.trim() : '';
      const nativeId =
        (typeof args.agent_id === 'string' && args.agent_id.trim()) ||
        (typeof args.session_id === 'string' && args.session_id.trim()) ||
        '';
      if ((workerId && nativeId) || (args.agent_id && args.session_id && args.agent_id.trim() !== args.session_id.trim())) throw new Error('请只提供一个一致的成员 id。');
      if (workerId === '' && nativeId === '') {
        throw new Error('council_enroll 需要 worker_id，或原生子智能体的 agent_id/session_id。');
      }
      if (workerId !== '') {
        const live = await adapter.listWorkers(agent.id, exec.signal);
        const worker = live.workers.find((item) => item.id === workerId);
        if (!worker) {
          throw new Error(
            `当前会话的 CLI Worker 列表中找不到 "${workerId}"。请使用 cliworker_start 的返回值；已存在的 Worker id：${live.workers.map((item) => item.id).join(', ') || '（无）'}`,
          );
        }
        const existing = state.members.find((member) => member.workerId === worker.id);
        if (!existing && state.members.length >= config.maxMembers) {
          throw new Error(`议会最多 ${config.maxMembers} 位成员；请先移除成员或调低配置。`);
        }
        const name = displayName(args.display_name, worker.agentName ?? worker.id);
        return JSON.stringify({
          enrolled: {
            kind: 'cliworker',
            workerId: worker.id,
            name,
            roleId: role.id,
            roleName: role.name,
            roleSummary: role.summary,
            readOnly: effectivePermission(worker) === 'read-only',
            roleReadOnly: role.readOnly,
            effectivePermission: effectivePermission(worker),
            verifiedParentId: agent.id,
            cli: worker.preference?.cli ?? '',
            model: worker.preference?.model ?? '',
            mode: worker.mode,
            status: worker.status,
          },
          note: existing ? '已更新该成员的议会角色。' : '成员已加入议会。',
          reminder: '不要输出成员入场播报、进度、说明或下一步计划；需要转达时调用 council_convene，否则直接结束回合。',
        });
      }

      const { child, entry } = await verifyChild(ctx, agent.id, nativeId, exec.signal);
      const header = child?.session?.header ?? {};
      const existing = state.members.find(
        (member) => member.kind === 'subagent' && member.sessionId === nativeId,
      );
      if (!existing && state.members.length >= config.maxMembers) {
        throw new Error(`议会最多 ${config.maxMembers} 位成员；请先移除成员或调低配置。`);
      }
      const name = displayName(args.display_name, header.title ?? entry.label ?? child?.id ?? nativeId);
      const model =
        child?.session?.model?.model ??
        child?.session?.header?.model?.model ??
        child?.model?.model ??
        '';
      return JSON.stringify({
        enrolled: {
          kind: 'subagent',
          workerId: nativeId,
          agentId: nativeId,
          sessionId: nativeId,
          name,
          roleId: role.id,
          roleName: role.name,
          roleSummary: role.summary,
          readOnly: effectivePermission(undefined, child) === 'read-only',
          roleReadOnly: role.readOnly,
          effectivePermission: effectivePermission(undefined, child),
          verifiedParentId: agent.id,
          cli: 'deepseek',
          model,
          mode: 'native',
          status: 'active',
        },
        note: existing ? '已更新该议员的议会角色。' : '原生子智能体已加入议会。',
        reminder: '不要输出成员入场播报、进度、说明或下一步计划；需要转达时调用 council_convene，否则直接结束回合。',
      });
    },
  });

  const convene = defineTool({
    name: 'council_convene',
    description: 'Publish the complete topic and structured discussion brief AFTER enrolling all requested members. This message appears first; discussion opens only after your turn ends and all members are ready. Members retain their sessions and directly read new peer messages from council_inbox. Never relay member replies. silent defaults true and ends this chair turn.',
    parameters: {
      new_room: { type: 'boolean', description: 'Start a new topic only when the user explicitly requests a new discussion.' },
      message: {
        type: 'string',
        description:
          'New user topic or user input only (max 8000 characters). Never copy member replies. Omit to read room status without dispatching.',
      },
      members: {
        type: 'string',
        description: 'Optional comma-separated exact member ids or unambiguous names. Only selected members are recipients; omit to include every enrolled member.',
      },
      message_id: {
        type: 'string',
        description: 'Optional stable id for admitting this exact user message and recipient list idempotently. Reuse it if the admission response is lost; never recreate uncertain member deliveries.',
      },
      silent: {
        type: 'boolean',
        description:
          'Default true: end the chair turn after admitting user input. Set false ONLY when the user explicitly asks the chair to comment; discussion continues independently.',
      },
    },
    output,
    timeoutMs: 2 * 60 * 1000,
    isConcurrencySafe: () => false,
    execute: async (args, exec) => {
      const agent = exec.agent;
      if (!agent) throw new Error('council_convene 需要主对话 Agent。');
      assertDispatchAllowed(agent);
      const state = stateOf(ctx, agent);
      assertActive(state);
      if (typeof args.topic === 'string') {
        throw new Error(
          'council_convene 不再接受 topic/完整转录。请只用 message 传自上次转达以来的新增消息；历史消息由宿主保存，不会重发。',
        );
      }
      const message = String(args.message ?? '').trim();
      if (message.length > 8000) {
        throw new Error('message 超过 8000 字符。只传新增消息，不要粘贴历史聊天记录。');
      }
      const silent = args.silent !== false;
      if (rooms) {
        if (!message) return JSON.stringify(rooms.snapshot(agent));
        const chosen = selectedMembers(state, args.members);
        const result = await rooms.input(agent, state.members, message, args.message_id ?? exec.callId ?? randomUUID(),
          { recipients: chosen.map((m) => m.sessionId || m.workerId), fresh: args.new_room === true });
        if (silent) exec.concludeTurn?.();
        return JSON.stringify({ ...result, note: '后台已接管讨论。成员会直接交流，禁止主控转发成员回复。' });
      }
      let workers = [];
      if (adapter.listWorkers && state.members.some((member) => member.kind !== 'subagent')) {
        workers = (await adapter.listWorkers(agent.id, exec.signal)).workers;
      }
      const members = selectedMembers(state, args.members, workers);
      if (members.length === 0) throw new Error('议会还没有成员；先登记成员。');
      const release = guard(agent.id);
      try {
        const result = String(
          await engine.relay({
            parentSessionId: agent.id,
            parentAgent: agent,
            members,
            message,
            messageId: args.message_id ?? exec.callId ?? randomUUID(),
            signal: exec.signal,
          }),
        );
        if (result.includes('未送达')) {
          const failureRule = silent
            ? '只简要说明失败原因，不写进度、计划或其他总结。'
            : '先简要说明失败原因，再输出用户明确要求的内容。';
          return `${result}\n\n【主持规则】有未送达内容；${failureRule}`;
        }
        const pending =
          typeof engine.pendingMembers === 'function'
            ? engine.pendingMembers(agent.id, state.members)
            : [];
        if (pending.length > 0) {
          return `${result}\n\n【主持规则】仍有未送达成员：${pending.join('、')}。请在本回合继续用 council_convene 补齐；不要输出正文、进度或计划。`;
        }
        if (!silent) {
          return `${result}\n\n【主持规则】用户明确要求你发言；只输出用户要求的那一项，不要附带进度、计划或其他总结。`;
        }
        if (typeof exec.concludeTurn === 'function') {
          exec.concludeTurn();
          return `${result}\n\n【主持规则】本回合已静默结束；不要输出正文。`;
        }
        return `${result}\n\n【主持规则】用户未要求你发言；不要输出进度、解释、总结、计划或收尾语，完成转达后直接结束回合（必须可见时只写“已转达。”）。`;
      } finally {
        release();
      }
    },
  });

  const assign = defineTool({
    name: 'council_assign',
    description:
      'Assign work orders to enrolled members by capability and return per-member results. Use council_roster first. Read-only members cannot receive write scopes; two members cannot share one write scope.',
    parameters: {
      assignments: {
        type: 'json',
        required: true,
        description:
          'JSON array of 1-6 objects: { member: string (roster name or worker id), task: string, acceptance?: string, write_scope?: string, reason?: string }.',
      },
    },
    output,
    timeoutMs: 60 * 60 * 1000,
    isConcurrencySafe: () => false,
    execute: async (args, exec) => {
      const agent = exec.agent;
      if (!agent) throw new Error('council_assign 需要主对话 Agent。');
      assertDispatchAllowed(agent);
      const state = stateOf(ctx, agent);
      assertActive(state);
      const assignments = parseAssignments(args.assignments);
      if (state.members.length === 0) throw new Error('议会还没有成员；先邀请并登记成员。');
      const room = rooms?.snapshot(agent);
      if (room && (room.status !== 'stopped' || room.deliveries.some((d) => ['sending', 'accepted', 'uncertain'].includes(d.status)))) {
        throw new Error('请先结束自主议题，并等待正在运行的成员完成、核对未确认投递，再分配执行任务。');
      }
      const release = guard(agent.id);
      try {
        await host?.release(agent.id);
        return await engine.assign({
          parentSessionId: agent.id,
          parentAgent: agent,
          members: state.members,
          assignments,
          signal: exec.signal,
        });
      } finally {
        release();
      }
    },
  });

  return { roster, enroll, convene, assign };
}

export { CLI_IDS };
