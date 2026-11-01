import assert from 'node:assert/strict';
import test from 'node:test';
import { createCouncilEngine } from '../lib/engine.js';
import { buildRelayPrompt } from '../lib/prompt.js';
import { createRelayLog } from '../lib/relay-log.js';
import { ROLE_BY_ID } from '../lib/catalog.js';

const config = {
  maxMembers: 6,
  maxRounds: 2,
  statementLimit: 1000,
  roundTimeoutMs: 200,
  assignmentTimeoutMs: 200,
  maxDigestChars: 8000,
};

function member(id, roleId = 'critic', overrides = {}) {
  const role = ROLE_BY_ID[roleId];
  return {
    kind: 'cliworker',
    workerId: id,
    name: id,
    roleId,
    roleName: role.name,
    roleSummary: role.summary,
    rolePrompt: role.prompt,
    readOnly: role.readOnly,
    ...overrides,
  };
}

class RecordingCliWorker {
  constructor() {
    this.calls = [];
    this.failures = new Map();
  }

  async followup(_parent, workerId, prompt) {
    const remaining = this.failures.get(workerId) ?? 0;
    if (remaining > 0) {
      this.failures.set(workerId, remaining - 1);
      throw new Error('请等待任务结束并完成进程清理后再管理此任务。');
    }
    this.calls.push({ workerId, prompt });
    return '{}';
  }
}

test('relay log keeps explicit recipients and ordered receipts', async () => {
  const log = createRelayLog();
  const first = await log.append('s1', '第一条', {recipients:['a']});
  assert.deepEqual(log.pending('s1', 'a').map((entry) => entry.seq), [first.seq]);
  assert.deepEqual(log.pending('s1', 'b'), []);
  await log.mark('s1', 'a', [first], 'delivered', 'receipt');
  assert.deepEqual(log.pending('s1', 'a'), []);
  const second = await log.append('s1', '第二条', {recipients:['a']});
  assert.deepEqual(log.pending('s1', 'a').map((entry) => entry.text), ['第二条']);
  assert.equal(second.seq, first.seq + 1);
});

test('relay prompt lists only the undelivered entries', () => {
  const prompt = buildRelayPrompt({
    entries: [
      { seq: 2, text: '旧消息' },
      { seq: 3, text: '新消息' },
    ],
    marker: 'm1',
  });
  assert.match(prompt, /^\[council:m1\]/);
  assert.match(prompt, /#2 旧消息/);
  assert.match(prompt, /#3 新消息/);
  assert.match(prompt, /按时间顺序/);
  assert.doesNotMatch(prompt, /群聊记录/);
});

test('second relay sends only the new message to members that already received the first', async () => {
  const adapter = new RecordingCliWorker();
  const engine = createCouncilEngine({ adapter, config });
  const members = [member('a'), member('b')];

  await engine.relay({
    parentSessionId: 'p1',
    members,
    message: '第一条',
    signal: new AbortController().signal,
  });
  await engine.relay({
    parentSessionId: 'p1',
    members,
    message: '第二条',
    signal: new AbortController().signal,
  });

  assert.equal(adapter.calls.length, 4);
  assert.match(adapter.calls[0].prompt, /第一条/);
  assert.match(adapter.calls[1].prompt, /第一条/);
  assert.match(adapter.calls[2].prompt, /第二条/);
  assert.doesNotMatch(adapter.calls[2].prompt, /第一条/);
  assert.match(adapter.calls[3].prompt, /第二条/);
  assert.doesNotMatch(adapter.calls[3].prompt, /第一条/);
});

test('a failed delivery is retried with the newer message and stays in order', async () => {
  const adapter = new RecordingCliWorker();
  adapter.failures.set('b', 1);
  const engine = createCouncilEngine({ adapter, config });
  const members = [member('a'), member('b')];

  await engine.relay({
    parentSessionId: 'p1',
    members,
    message: '旧消息',
    signal: new AbortController().signal,
  });
  assert.equal(adapter.calls.length, 1);
  assert.equal(adapter.calls[0].workerId, 'a');

  await engine.relay({
    parentSessionId: 'p1',
    members,
    message: '新消息',
    signal: new AbortController().signal,
  });
  const retry = adapter.calls.find((call) => call.workerId === 'b');
  assert.ok(retry);
  assert.match(retry.prompt, /#1 旧消息/);
  assert.match(retry.prompt, /#2 新消息/);
  const fresh = adapter.calls.find((call) => call.workerId === 'a' && call.prompt.includes('新消息'));
  assert.ok(fresh);
  assert.doesNotMatch(fresh.prompt, /旧消息/);
});

test('a member enrolled later starts from the current tail', async () => {
  const adapter = new RecordingCliWorker();
  const engine = createCouncilEngine({ adapter, config });

  await engine.relay({
    parentSessionId: 'p1',
    members: [member('a')],
    message: '第一条',
    signal: new AbortController().signal,
  });
  await engine.relay({
    parentSessionId: 'p1',
    members: [member('a'), member('b')],
    message: '第二条',
    signal: new AbortController().signal,
  });

  const late = adapter.calls.find((call) => call.workerId === 'b');
  assert.ok(late);
  assert.match(late.prompt, /第二条/);
  assert.doesNotMatch(late.prompt, /第一条/);
});

test('an identical message id does not resend to up-to-date members', async () => {
  const adapter = new RecordingCliWorker();
  const engine = createCouncilEngine({ adapter, config });
  const members = [member('a')];
  await engine.relay({
    parentSessionId: 'p1',
    members,
    message: '同一条',
    messageId: 'retry-1',
    signal: new AbortController().signal,
  });
  const again = await engine.relay({
    parentSessionId: 'p1',
    members,
    message: '同一条',
    messageId: 'retry-1',
    signal: new AbortController().signal,
  });
  assert.equal(adapter.calls.length, 1);
  assert.match(again, /忽略重复|已是最新/);
});

test('native subagent members receive the incremental prompt', async () => {
  const sent = [];
  const engine = createCouncilEngine({
    adapter: new RecordingCliWorker(),
    config,
    ctx: {
      subagents: {
        async listChildren() { return [{ id: "child-1", mode: "continuable" }]; },
        async sendMessage(sender, targetId, content, options) {
          sent.push({ sender, targetId, text: content[0]?.text, signal: options.signal });
          return 'message-1';
        },
      },
    },
  });
  const parentAgent = { id: 'main-1' };
  const result = await engine.relay({
    parentSessionId: 'p1',
    parentAgent,
    members: [
      member('child-1', 'researcher', {
        kind: 'subagent',
        agentId: 'child-1',
        sessionId: 'child-1',
      }),
    ],
    message: '新回复',
    signal: new AbortController().signal,
  });
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /新回复/);
  assert.match(result, /1\/1|已按时间顺序投递/);
});
