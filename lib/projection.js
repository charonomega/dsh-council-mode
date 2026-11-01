/** Log-only council projection: mode, phase, enrolled members, assignment notices. */

import { reduceRelayRecord } from './relay-log.js';
import { ROLE_BY_ID } from './catalog.js';
import { roomView } from './room-service.js';

export const COUNCIL_PROJECTION_KEY = 'council';
export const COUNCIL_STATE_VERSION = 3;

const PHASES = new Set(['idle', 'discussion', 'synthesis', 'execution']);

/** @returns {object} a fresh empty projection state */
export function emptyCouncilState() {
  return {
    relay: null,
    room: null,
    roomHistory: [],
    active: false,
    phase: 'idle',
    topic: '',
    rounds: 2,
    members: [],
    assignments: [],
    pendingCommand: null,
    pendingEnroll: null,
    phaseCallId: null,
    lastError: '',
  };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Parse one JSON object argument field without throwing. */
export function parseArguments(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  try {
    const value = JSON.parse(raw);
    return isObject(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function commandMode(args) {
  const text = typeof args === 'string' ? args.trim().toLowerCase() : '';
  if (text === '' || text === 'on') return true;
  if (text === 'off') return false;
  return undefined;
}

function toolCallId(data) {
  return data?.message?.toolCallId ?? data?.message?.source?.callId;
}

function toolFailed(data) {
  return data?.error !== undefined || data?.message?.isError === true;
}

function toolErrorText(data) {
  const error = data?.error;
  if (error === undefined) return '';
  if (typeof error === 'string') return error;
  return error.reason ?? error.code ?? error.name ?? '工具执行失败';
}

function resultPayload(data) {
  const content = data?.message?.content ?? data?.content ?? [];
  for (const block of content) {
    if (block?.type !== 'text') continue;
    try { const value = JSON.parse(block.text); if (isObject(value)) return value; } catch { /* legacy text */ }
  }
  return undefined;
}

function makeMember(call, role, time) {
  const roleId = typeof call.roleId === 'string' ? call.roleId : 'member';
  const resolved = role ?? ROLE_BY_ID[roleId];
  const agentId = typeof call.agentId === 'string' && call.agentId !== '' ? call.agentId : undefined;
  const sessionId =
    typeof call.sessionId === 'string' && call.sessionId !== '' ? call.sessionId : undefined;
  const native = call.kind === 'subagent' || agentId !== undefined || sessionId !== undefined;
  const memberId = call.workerId ?? agentId ?? sessionId;
  return {
    kind: native ? 'subagent' : 'cliworker',
    workerId: memberId,
    agentId: native ? agentId ?? sessionId ?? memberId : undefined,
    sessionId: native ? sessionId ?? agentId ?? memberId : undefined,
    cli: native ? 'deepseek' : call.cli ?? '',
    model: call.model ?? '',
    name: call.name || call.display_name || memberId,
    roleId,
    roleName: resolved?.name ?? roleId,
    roleSummary: resolved?.summary ?? '',
    rolePrompt: resolved?.prompt ?? '',
    readOnly: call.effectivePermission === 'read-only',
    roleReadOnly: resolved?.readOnly === true,
    effectivePermission: call.effectivePermission ?? 'unknown',
    verifiedParentId: call.verifiedParentId,
    at: time,
  };
}

function commitEnroll(state, pending, eventTime) {
  const role = ROLE_BY_ID[pending.roleId];
  const member = makeMember(pending, role, eventTime);
  const index = state.members.findIndex((item) => item.workerId === member.workerId);
  if (index >= 0) {
    const members = state.members.slice();
    members[index] = { ...member, at: members[index].at };
    return { ...state, members, pendingEnroll: null };
  }
  if (state.members.length >= pending.maxMembers) {
    return { ...state, pendingEnroll: null };
  }
  return { ...state, members: [...state.members, member], pendingEnroll: null };
}

function collectAssignments(args, time) {
  if (!isObject(args) || !Array.isArray(args.assignments)) return [];
  return args.assignments.slice(0, 6).flatMap((item) => {
    if (!isObject(item) || typeof item.member !== 'string' || item.member === '') return [];
    if (typeof item.task !== 'string' || item.task === '') return [];
    return [
      {
        member: item.member,
        task: item.task.slice(0, 500),
        writeScope: typeof item.write_scope === 'string' ? item.write_scope.slice(0, 200) : '',
        reason: typeof item.reason === 'string' ? item.reason.slice(0, 300) : '',
        status: 'running',
        at: time,
      },
    ];
  });
}

function markAssignments(state, status) {
  if (state.assignments.length === 0) return state;
  return {
    ...state,
    assignments: state.assignments.map((item) =>
      item.status === 'running' ? { ...item, status } : item,
    ),
  };
}

function validState(value) {
  if (!isObject(value)) return false;
  if (typeof value.active !== 'boolean') return false;
  if (!PHASES.has(value.phase)) return false;
  if (typeof value.topic !== 'string' || typeof value.rounds !== 'number') return false;
  if (!Array.isArray(value.members) || !Array.isArray(value.assignments)) return false;
  return true;
}

function validView(value) {
  return (
    isObject(value) &&
    typeof value.active === 'boolean' &&
    PHASES.has(value.phase) &&
    typeof value.topic === 'string' &&
    typeof value.rounds === 'number' &&
    Array.isArray(value.members) &&
    Array.isArray(value.assignments)
  );
}

// Host event forwarding rejects explicit undefined, even though JSON.stringify
// silently drops it. Optional member/task fields must be absent on the wire.
function definedFields(value) {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined));
}

const stateSchema = {
  parse(value) {
    if (!validState(value)) throw new Error('invalid council projection state');
    return value;
  },
};

const viewSchema = {
  parse(value) {
    if (!validView(value)) throw new Error('invalid council projection view');
    return value;
  },
};

/**
 * Build the `council` projection unit.
 * @param {ReturnType<import('./config.js').resolveConfig>} config
 */
export function createCouncilProjection(config, owner) {
  const views = new WeakMap();

  return {
    key: COUNCIL_PROJECTION_KEY,
    stateVersion: COUNCIL_STATE_VERSION,
    stateSchema,
    viewSchema,
    init() {
      return emptyCouncilState();
    },
    apply(state, event) {
      switch (event.type) {
        case 'plugin:council/room': {
          if (event.ignorable !== true || !event.data?.room?.id) return state;
          const room = event.data.room;
          const history = state.room && state.room.id !== room.id
            ? [...(state.roomHistory ?? []), { ...state.room, status: 'stopped', reason: '已开始新议题。' }].slice(-10) : state.roomHistory ?? [];
          return { ...state, room, roomHistory: history, topic: room.topic.slice(0, 500),
            phase: room.status === 'running' ? 'discussion' : 'idle' };
        }
        case 'plugin:council/relay': {
          if (event.ignorable !== true || !event.data?.parentId) return state;
          return { ...state, relay: reduceRelayRecord(state.relay, event.data) };
        }
        case 'turn/start': {
          if (state.room?.status === 'running') return state;
          if (state.phase === 'idle') return state;
          return { ...state, phase: 'idle' };
        }
        case 'command/run': {
          const name = event.data?.name;
          if (name !== 'council') return state;
          const target = commandMode(event.data?.args);
          if (target === undefined) return state;
          return {
            ...state,
            pendingCommand: {
              commandId: event.data?.commandId,
              active: target,
            },
          };
        }
        case 'command/done': {
          const pending = state.pendingCommand;
          if (pending === null || pending.commandId !== event.data?.commandId) return state;
          if (event.data?.kind !== 'success') {
            return { ...state, pendingCommand: null };
          }
          return {
            ...state,
            active: pending.active,
            phase: pending.active ? state.phase : 'idle',
            topic: pending.active && !state.active ? '' : state.topic,
            lastError: '',
            pendingCommand: null,
          };
        }
        case 'tool/call': {
          const name = event.data?.name;
          const callId = event.data?.callId;
          if (name === 'council_enroll') {
            const args = parseArguments(event.data?.arguments);
            const workerId =
              isObject(args) && typeof args.worker_id === 'string' ? args.worker_id.trim() : '';
            const agentId =
              isObject(args) && typeof args.agent_id === 'string' ? args.agent_id.trim() : '';
            const sessionId =
              isObject(args) && typeof args.session_id === 'string' ? args.session_id.trim() : '';
            if (
              !isObject(args) ||
              typeof args.role_id !== 'string' ||
              (workerId === '' && agentId === '' && sessionId === '')
            ) {
              return state;
            }
            return {
              ...state,
              lastError: '',
              pendingEnroll: {
                callId,
                kind: workerId === '' ? 'subagent' : 'cliworker',
                workerId: workerId || agentId || sessionId,
                agentId,
                sessionId,
                roleId: args.role_id,
                name: typeof args.display_name === 'string' ? args.display_name : '',
                maxMembers: config.maxMembers,
              },
            };
          }
          if (name === 'council_convene') {
            const args = parseArguments(event.data?.arguments);
            const message =
              isObject(args) && typeof args.message === 'string'
                ? args.message
                : isObject(args) && typeof args.topic === 'string'
                  ? args.topic
                  : '';
            const topic = state.topic === '' ? message.trim().slice(0, 500) : state.topic;
            return {
              ...state,
              phase: 'discussion',
              topic,
              phaseCallId: callId,
              lastError: '',
            };
          }
          if (name === 'council_assign') {
            const args = parseArguments(event.data?.arguments);
            return {
              ...state,
              phase: 'execution',
              phaseCallId: callId,
              assignments: collectAssignments(args, event.time),
              lastError: '',
            };
          }
          return state;
        }
        case 'tool/result': {
          const failed = toolFailed(event.data);
          const callId = toolCallId(event.data);
          let next = state;
          if (next.pendingEnroll !== null && next.pendingEnroll.callId === callId) {
            if (failed) {
              next = { ...next, pendingEnroll: null, lastError: toolErrorText(event.data) };
            } else {
              const canonical = resultPayload(event.data)?.enrolled;
              const pending = next.pendingEnroll;
              // Legacy entries remain visible, but are never treated as verified native chats.
              const valid = canonical?.workerId === pending.workerId && canonical?.roleId === pending.roleId;
              next = commitEnroll(next, valid ? { ...pending, ...canonical } : pending, event.time);
            }
          }
          if (next.phaseCallId !== null && next.phaseCallId === callId) {
            const results = resultPayload(event.data)?.results;
            const assignments = next.phase !== 'execution' ? next.assignments : next.assignments.map((item, index) => {
              const result = Array.isArray(results) ? results[index] : undefined;
              const statuses = ['accepted', 'running', 'completed', 'failed', 'cancelled', 'uncertain'];
              return { ...item, status: result?.member === item.member && statuses.includes(result.status) ? result.status : 'uncertain',
                error: result?.error ?? (failed ? toolErrorText(event.data) : ''), runId: result?.runId ?? '' };
            });
            next = { ...next, assignments, phase: 'idle', phaseCallId: null,
              lastError: failed ? toolErrorText(event.data) : assignments.some((item) => item.status === 'failed' || item.status === 'uncertain') ? '部分任务失败或状态未确认；请查看逐项结果。' : '' };
          }
          return next;
        }
        case 'assistant/message': {
          if (state.phase !== 'synthesis') return state;
          return { ...state, phase: 'idle' };
        }
        default:
          return state;
      }
    },
    wire: {
      viewSchema,
      view(state) {
        const cached = views.get(state);
        if (cached !== undefined) return cached;
        const view = {
          room: roomView(state.room, owner),
          roomHistory: state.roomHistory ?? [],
          active: state.active,
          phase: state.phase === 'execution' ? 'execution' : state.room ? (roomView(state.room, owner).status === 'running' ? 'discussion' : 'idle') : state.phase,
          topic: state.topic,
          rounds: state.rounds,
          maxMembers: config.maxMembers,
          members: state.members.map((member) => definedFields({
            kind: member.kind ?? 'cliworker',
            workerId: member.workerId,
            agentId: member.agentId,
            sessionId: member.sessionId,
            name: member.name,
            cli: member.cli ?? '',
            model: member.model ?? '',
            roleId: member.roleId,
            roleName: member.roleName,
            roleSummary: member.roleSummary,
            readOnly: member.readOnly,
            roleReadOnly: member.roleReadOnly,
            effectivePermission: member.effectivePermission,
            verifiedParentId: member.verifiedParentId,
            at: member.at,
          })),
          assignments: state.assignments.map((item) => definedFields({
            member: item.member,
            task: item.task,
            writeScope: item.writeScope,
            reason: item.reason,
            status: item.status,
            error: item.error,
            runId: item.runId,
            at: item.at,
          })),
        };
        views.set(state, view);
        return view;
      },
    },
  };
}
