import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COUNCIL_POLICY,
  buildAssignmentPrompt,
  buildConveneDigest,
  buildInviteRequest,
  buildDiscussionPrompt,
  buildRelayPrompt,
  stripFinalOpinionPrefix,
  uniqueAgentName,
} from '../lib/prompt.js';
import { ROLE_BY_ID } from '../lib/catalog.js';

test('invite request carries the role, worker steps, and read-only guidance', () => {
  const request = buildInviteRequest({ cli: 'codex', roleId: 'reviewer', sessionTitle: '登录改造' });
  assert.match(request, /Codex/);
  assert.match(request, /role_id="reviewer"/);
  assert.match(request, /read_only: true/);
  assert.match(request, /council_enroll/);
  assert.match(request, /不要替用户选择/);
});

test('kimi invite omits read_only', () => {
  const request = buildInviteRequest({ cli: 'kimi', roleId: 'reviewer', sessionTitle: 'x' });
  assert.match(request, /Kimi 的非交互模式不支持 read_only/);
  assert.doesNotMatch(request, /read_only: true/);
});

test('unique agent names append the first free numeric suffix', () => {
  assert.equal(uniqueAgentName('codex-critic', []), 'codex-critic');
  assert.equal(uniqueAgentName('codex-critic', ['codex-critic']), 'codex-critic-2');
  assert.equal(uniqueAgentName('codex-critic', ['codex-critic', 'codex-critic-2']), 'codex-critic-3');
  assert.equal(uniqueAgentName('codex-critic', ['codex-critic', 'codex-critic-2', 'codex-critic-3']), 'codex-critic-4');
  assert.equal(uniqueAgentName('codex-critic-2', ['codex-critic']), 'codex-critic-2');
  assert.equal(uniqueAgentName('codex-critic-2', ['codex-critic-2', 'codex-critic-3']), 'codex-critic-4');
});

test('invite request uses the supplied unique agent name', () => {
  const request = buildInviteRequest({
    cli: 'codex',
    roleId: 'critic',
    sessionTitle: 'x',
    agentName: 'codex-critic-2',
  });
  assert.match(request, /agent_name: "codex-critic-2"/);
  assert.match(request, /display_name: "codex-critic-2"/);
});

test('discussion prompt relays the transcript without role or round guidance', () => {
  const prompt = buildDiscussionPrompt({
    topic: '选 A 还是 B',
    focus: '成本',
    round: 2,
    rounds: 2,
    member: { name: 'codex-reviewer', roleId: 'reviewer' },
    role: ROLE_BY_ID.reviewer,
    prior: ['成员 A（研究员）：我倾向 A。', '成员 B（反方）：我反对。'],
    ownPrevious: '我上一轮说 A。',
    marker: 'abc123',
  });
  assert.match(prompt, /^\[council:abc123\]/);
  assert.match(prompt, /选 A 还是 B/);
  assert.match(prompt, /成员 A（研究员）：我倾向 A/);
  assert.match(prompt, /轮到你发言/);
  assert.doesNotMatch(prompt, /角色要求/);
  assert.doesNotMatch(prompt, /本轮关注/);
  assert.doesNotMatch(prompt, /最终立场/);
  assert.doesNotMatch(prompt, /第 2\/2 轮/);
});

test('council policy keeps the chair silent by default', () => {
  assert.match(COUNCIL_POLICY, /不需要主控逐条转发/);
  assert.match(COUNCIL_POLICY, /默认不输出任何正文/);
  assert.match(COUNCIL_POLICY, /只有用户明确要求/);
  assert.match(COUNCIL_POLICY, /不要转发成员回复/);
  assert.match(COUNCIL_POLICY, /cliworker_followup/);
  assert.match(COUNCIL_POLICY, /silent:false/);
  assert.match(COUNCIL_POLICY, /不要评价、计分、裁判/);
});

test('policy routes DeepSeek to native subagents and other models to native CLIs', () => {
  assert.match(COUNCIL_POLICY, /任何 DeepSeek 模型/);
  assert.match(COUNCIL_POLICY, /原生 subagent/);
  assert.match(COUNCIL_POLICY, /GPT.*codex/);
  assert.match(COUNCIL_POLICY, /Claude.*claude/);
  assert.match(COUNCIL_POLICY, /不要用 pwsh/);
  assert.match(COUNCIL_POLICY, /ask_user_question/);
});

test('incremental relay prompt carries only new entries', () => {
  const prompt = buildRelayPrompt({
    entries: [{ seq: 4, text: '只有这一条新消息' }],
    marker: 'new1',
  });
  assert.match(prompt, /^\[council:new1\]/);
  assert.match(prompt, /议会新增消息/);
  assert.match(prompt, /#4 只有这一条新消息/);
  assert.match(prompt, /轮到你发言/);
  assert.doesNotMatch(prompt, /群聊记录/);
  assert.doesNotMatch(prompt, /角色要求/);
});

test('digest reports relay results without forcing a final opinion', () => {
  const digest = buildConveneDigest({
    topic: 't',
    rounds: 2,
    results: [
      { ok: true, name: 'Codex', roleName: '代码审查员', cli: 'codex', text: 'x'.repeat(30), limit: 10, truncated: true },
      { ok: false, name: 'Claude', roleName: '研究员', cli: 'claude', error: '超时' },
    ],
    limit: 4000,
  });
  assert.match(digest, /1\/2 位成员/);
  assert.match(digest, /已截断/);
  assert.match(digest, /超时/);
  assert.match(digest, /转达完成/);
  assert.doesNotMatch(digest, /请据此给出最终意见/);
});

test('assignment prompt and final prefix', () => {
  const prompt = buildAssignmentPrompt({
    member: { name: 'c' },
    role: ROLE_BY_ID.engineer,
    assignment: { task: '修 bug', acceptance: '测试通过', write_scope: 'src/' },
    marker: 'm',
  });
  assert.match(prompt, /^\[council:m\]/);
  assert.match(prompt, /修 bug/);
  assert.match(prompt, /src\//);
  assert.equal(stripFinalOpinionPrefix('【最终意见】结论'), '结论');
  assert.equal(stripFinalOpinionPrefix('普通'), '普通');
});
