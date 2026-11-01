/** Host entry for Council Mode. */

import { appendPluginRecord } from '@deepseek-ai/dsh-session';
import { foldSubagentDescriptor, applyChildComposition } from '@deepseek-ai/dsh-subagent';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { invitationIssue, MEMBER_TOOLS } from './lib/member-protocol.js';
import { createRoomService } from './lib/room-service.js';
import { createRoomHost } from './lib/room-host.js';
import { createRoomTools } from './lib/room-tools.js';
import { createRelayLog } from './lib/relay-log.js';
import { createUserMessage } from './lib/create-message.js';
import { createCliWorkerAdapter } from './lib/adapter.js';
import { CLIS, CLI_IDS, ROLE_BY_ID, ROLE_IDS_TEXT, cliLabel } from './lib/catalog.js';
import { liveCouncilConfig } from './lib/config-schema.js';
import { createCouncilEngine } from './lib/engine.js';
import { COUNCIL_POLICY, buildInviteRequest, uniqueAgentName } from './lib/prompt.js';
import { COUNCIL_PROJECTION_KEY, createCouncilProjection, emptyCouncilState } from './lib/projection.js';
import { councilDispatchIssue, createCouncilTools } from './lib/tools.js';

export const inject = ['tools', 'systemPrompt', 'sessionProjections'];
export { Config } from './lib/config-schema.js';

const COMMAND_ID = '@local/dsh-council-mode';

function stateOf(ctx, agent) {
  try {
    return ctx.sessionProjections.stateOf(agent.session, COUNCIL_PROJECTION_KEY) ?? emptyCouncilState();
  } catch {
    return emptyCouncilState();
  }
}

function cliworkerOf(ctx) {
  return ctx.get('cliworker');
}

function enableIssue(ctx, agent) {
  try {
    const dispatchIssue = councilDispatchIssue(agent);
    if (dispatchIssue !== null) return dispatchIssue;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  if (!cliworkerOf(ctx)) {
    return '未检测到 CLI Worker 插件；请先安装 dsh-cliworker-now，并至少登录一个 CLI。';
  }
  return null;
}

function usage() {
  return '用法：/council on|off|status|invite <cli> <role>|start <议题>|say <补充>|pause|resume|stop|unlimited on|off|room-status|room-resolve <投递id> received|retry；旧投递核对：resolve <seq> <member-id> received|retry';
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {Record<string, unknown>} rawConfig
 */
export function apply(ctx, rawConfig = {}) {
  const config = liveCouncilConfig(rawConfig);
  const owner = randomUUID();
  const projection = createCouncilProjection(config, owner);
  ctx.sessionProjections.register(projection);
  ctx.inject(['skills'], (scope) => {
    const url = new URL('./skills/dsh-council-member/SKILL.md', import.meta.url);
    scope.effect(() => scope.skills.register({ name: 'dsh-council-member',
      description: 'DSH 议会成员：读取直接收件箱，向同伴发言；固定会话、增量消息。',
      source: '@local/dsh-council-mode', path: fileURLToPath(url),
      content: readFileSync(url, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, ''),
      invocation: { modelInvocable: true, userInvocable: true },
    }), 'council: member skill');
  });

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: 'council:policy',
        order: 9999,
        text: (context) => {
          const agent = context.agent;
          if (!agent) return '';
          return stateOf(ctx, agent).active ? COUNCIL_POLICY : '';
        },
      }),
    'council: policy section',
  );

  const adapter = createCliWorkerAdapter(ctx);
  const relayLog = createRelayLog({
    read: (id) => {
      const agent = ctx.get('agents')?.get(id);
      if (!agent) throw new Error('议会主会话不可用，不能读取投递日志。');
      return ctx.sessionProjections.stateOf(agent.session, COUNCIL_PROJECTION_KEY)?.relay;
    },
    write: async (id, event) => {
      const agent = ctx.get('agents')?.get(id);
      if (!agent) throw new Error('议会主会话不可用，不能保存投递日志。');
      await appendPluginRecord(agent.session, 'plugin:council/relay', event);
    },
  });
  const engine = createCouncilEngine({ adapter, config, ctx, relayLog });
  const host = createRoomHost({ ctx, adapter, config, nativeOptions: async (id, signal, parent) => {
    const observation = await ctx.get('sessionQuery').observeSession(id, { signal });
    try {
      const descriptor = foldSubagentDescriptor(observation.events.slice(observation.inheritedEventCount));
      if (!descriptor || descriptor.mode !== 'continuable') throw new Error('成员缺少可恢复的模型描述。');
      const agentOptions = Object.fromEntries([
        ['provider', descriptor.agentProvider], ['model', descriptor.agentModel], ['reasoningEffort', descriptor.agentReasoningEffort],
      ].filter(([, value]) => value !== undefined));
      const own = observation.events.slice(observation.inheritedEventCount);
      const independent = own.some((e) => e.type === 'agent-preset/selected');
      const agentPreset = independent ? observation.projections?.values?.agentPreset : undefined;
      if (independent && typeof agentPreset !== 'string') throw new Error('成员缺少可恢复的预设。');
      return { agentOptions, setup: async (childCtx) => {
        await applyChildComposition(childCtx, parent, { agentPreset, persona: descriptor.persona, toolFilter: descriptor.toolFilter });
        childCtx.tools.restrict({ allow: MEMBER_TOOLS });
        childCtx.systemPrompt.section({ name: 'council:member', order: 9998,
          text: '收到 council_inbox 通知时使用 dsh-council-member 技能，从收件箱读取同伴原始消息。' });
      } };
    } finally { observation[Symbol.dispose](); }
  } });
  const rooms = createRoomService({ config, owner,
    read: (parent) => stateOf(ctx, parent).room,
    write: async (parent, room) => {
      if (ctx.get('agents')?.get(parent.id) !== parent) throw new Error('议会主会话已卸载。');
      await appendPluginRecord(parent.session, 'plugin:council/room', { room });
      // Flush write-ahead identities before any external admission is attempted.
      await ctx.get('sessions').flush(parent.session);
    },
    ready: host.ready, run: host.run, release: host.release,
    onError: (error) => ctx.logger.warn(`council room: ${String(error?.message ?? error)}`),
  });
  host.attach(rooms);
  ctx.effect(() => async () => { rooms.dispose(); await host.dispose(); }, 'council: room scheduler');
  const tools = { ...createCouncilTools({ ctx, config, adapter, engine, rooms, host }), ...createRoomTools(rooms, host) };
  for (const [name, definition] of Object.entries(tools)) {
    ctx.effect(() => ctx.tools.register(definition), `council: tool ${name}`);
  }

  // Members publish directly to the room; the chair only admits user input.
  if (typeof ctx.tools.guard === 'function') {
    ctx.effect(
      () =>
        ctx.tools.guard((execution) => {
          try {
            const agent = execution.agent;
            if (host.isParticipant(agent)) {
              if (host.isNative(agent) && !MEMBER_TOOLS.includes(execution.name)) return '自主议会成员本轮只讨论；使用议会收件箱与发言工具。';
              if (['send_message', 'council_convene', 'council_assign', 'council_enroll', 'cliworker_followup'].includes(execution.name)) return '请直接使用 council_post 与成员交流，不请求主控转发。';
              return undefined;
            }
            if (!agent || agent.session?.header?.origin === 'subagent') return undefined;
            if (!stateOf(ctx, agent).active) return undefined;
            const inviteIssue = invitationIssue(execution);
            if (inviteIssue) return inviteIssue;
            if (execution.name === 'cliworker_followup' || execution.name === 'send_message') {
              return '议会模式下，成员通过 council_post 自主交流。只把用户的新议题或补充交给 council_convene；不要复制、转发成员回复，也不要自动重试状态未确认的投递。';
            }
          } catch {
            /* fail open for unrelated tools */
          }
          return undefined;
        }),
      'council: autonomous discussion tool guard',
    );
  }

  ctx.inject(['commands'], (scope) => {
    scope.effect(
      () =>
        scope.commands.register({
          definitionId: COMMAND_ID,
          name: 'council',
          description: '进入议会、邀请成员、发起自主讨论、补充意见、暂停/继续或核对投递',
          input: { hint: '[on|off|status|invite <cli> <role>|start <议题>|say <补充>|pause|resume|stop|unlimited on|off|room-status|room-resolve <id> received|retry]' },
          handler: async ({ agent, rawInput }) => {
            if (!agent) return { kind: 'error', text: '议会命令需要主对话 Agent。' };
            const text = String(rawInput ?? '').trim();
            const [verb = '', ...rest] = text.split(/\s+/u);
            const action = verb.toLowerCase();

            if (action === '' || action === 'on') {
              const issue = enableIssue(ctx, agent);
              if (issue !== null) return { kind: 'error', text: issue };
              const state = stateOf(ctx, agent);
              if (state.active) return { kind: 'success', text: '议会模式已开启。' };
              return {
                kind: 'success',
                text: '议会模式已开启。点会话标题下的「议会」标签页查看群聊；点「成员」邀请 CLI Worker。',
              };
            }

            if (['start', 'say', 'pause', 'resume', 'stop', 'unlimited', 'room-status', 'room-resolve'].includes(action)) {
              const issue = enableIssue(ctx, agent);
              if (issue) return { kind: 'error', text: issue };
              const state = stateOf(ctx, agent);
              if (!state.active) return { kind: 'error', text: '请先 /council on。' };
              try {
                if (action === 'start' || action === 'say') {
                  const body = text.slice(verb.length).trim();
                  // JSON is the UI envelope; plain command text is also accepted.
                  let input = { content: body, id: randomUUID() };
                  if (body.startsWith('{')) { try { input = JSON.parse(body); } catch { /* plain text */ } }
                  const result = await rooms.input(agent, state.members, input.content, input.id,
                    { fresh: action === 'start' });
                  return { kind: 'success', text: `议会消息 #${result.seq} 已入队，成员将自主交流。` };
                }
                const result = await rooms.control(agent, action === 'room-status' ? 'status' : action === 'room-resolve' ? 'resolve' : action, rest[0], rest[1]);
                return { kind: 'success', text: JSON.stringify(result) };
              } catch (error) { return { kind: 'error', text: String(error?.message ?? error) }; }
            }

            if (action === 'off') {
              const state = stateOf(ctx, agent);
              if (state.room) await rooms.control(agent, 'pause');
              return {
                kind: 'success',
                text: state.active ? '议会模式已关闭。' : '议会模式本来就没有开启。',
              };
            }

            if (action === 'status') {
              const state = stateOf(ctx, agent);
              const names = state.members.map((member) => `${member.name}（${member.roleName}）`);
              return {
                kind: 'success',
                text: [
                  `议会模式：${state.active ? '已开启' : '未开启'}`,
                  `阶段：${state.phase}`,
                  `成员：${state.members.length}${names.length > 0 ? ` — ${names.join('、')}` : ''}`,
                  state.topic ? `议题：${state.topic}` : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
              };
            }

            if (action === 'resolve') {
              if (agent.session.header.origin === 'subagent') return { kind: 'error', text: '仅主会话可以处理投递回执。' };
              const [seq, memberId, resolution] = rest;
              try {
                const result = await engine.resolveDelivery({ parentSessionId: agent.id, memberId, seq: Number(seq), resolution });
                return { kind: 'success', text: result };
              } catch (error) { return { kind: 'error', text: String(error?.message ?? error) }; }
            }

            if (action === 'invite') {
              const state = stateOf(ctx, agent);
              if (!state.active) return { kind: 'error', text: '先开启议会模式：/council on' };
              if (state.members.length >= config.maxMembers) {
                return { kind: 'error', text: `议会最多 ${config.maxMembers} 位成员；请先移除成员或调低配置。` };
              }
              const issue = enableIssue(ctx, agent);
              if (issue !== null) return { kind: 'error', text: issue };
              const [cliRaw = '', roleRaw = ''] = rest;
              const cli = cliRaw.toLowerCase();
              const roleId = roleRaw.toLowerCase();
              if (!CLIS[cli]) {
                return { kind: 'error', text: `未知 CLI "${cliRaw}"；可用：${CLI_IDS.join(', ')}。` };
              }
              if (!ROLE_BY_ID[roleId]) {
                return { kind: 'error', text: `未知议会角色 "${roleRaw}"；可用：${ROLE_IDS_TEXT}。` };
              }
              const titleService = ctx.get('sessionTitle');
              let sessionTitle = '议会';
              try {
                sessionTitle = titleService?.get(agent.session)?.title ?? '议会';
              } catch {
                sessionTitle = '议会';
              }
              const baseName = `${cli}-${roleId}`;
              const takenNames = state.members.map((member) => member.name).filter(Boolean);
              try {
                const roster = await adapter.listWorkers(agent.id);
                for (const worker of [...(roster.workers ?? []), ...(roster.archivedWorkers ?? [])]) {
                  if (worker?.agentName) takenNames.push(worker.agentName);
                }
              } catch {
                /* The council names still keep the common case unique. */
              }
              const agentName = uniqueAgentName(baseName, takenNames);
              const nameNote = agentName === baseName ? '' : `（已自动避让重名：${agentName}）`;
              const summary = `邀请 ${cliLabel(cli)} 加入议会${nameNote}`;
              const request = buildInviteRequest({ cli, roleId, sessionTitle, agentName });
              try {
                agent.followup(
                  createUserMessage({
                    content: [{ type: 'text', text: request }],
                    source: { kind: 'council', form: 'request', summary },
                  }),
                );
              } catch (error) {
                return {
                  kind: 'error',
                  text: `邀请请求发送失败：${error instanceof Error ? error.message : String(error)}`,
                };
              }
              return {
                kind: 'success',
                text: `已请求 DSH 邀请 ${cliLabel(cli)}（${ROLE_BY_ID[roleId].name}，${agentName}）。请在随后的 CLI Worker 选择卡片中确认模型、强度和原生角色；完成后 DSH 会自动登记议会成员。`,
              };
            }

            return { kind: 'error', text: `${usage()}\n未知子命令 "${verb}"。` };
          },
        }),
      'council: command',
    );
  });
}

export { COUNCIL_POLICY };
