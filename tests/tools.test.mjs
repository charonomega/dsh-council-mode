import assert from 'node:assert/strict';
import test from 'node:test';
import { createCouncilTools } from '../lib/tools.js';
import { resolveConfig } from '../lib/config.js';

const config = resolveConfig({});

function createHarness(relayResult, pendingMembers = []) {
  const state = {
    active: true,
    phase: 'idle',
    topic: '议题',
    rounds: 2,
    members: [
      {
        kind: 'cliworker',
        workerId: 'w1',
        name: 'Codex',
        roleId: 'critic',
        roleName: '批评者',
        roleSummary: '',
        readOnly: true,
      },
    ],
    assignments: [],
  };
  const agent = {
    id: 'main-1',
    session: { header: { origin: 'user' } },
    ctx: { get: () => undefined },
  };
  const ctx = {
    sessionProjections: { stateOf: () => state },
    get: () => undefined,
  };
  const engine = {
    async relay() {
      return relayResult;
    },
    pendingMembers() {
      return pendingMembers;
    },
  };
  const tools = createCouncilTools({ ctx, config, adapter: {}, engine });
  return { convene: tools.convene, agent };
}

function execution(agent, counter) {
  return {
    agent,
    signal: new AbortController().signal,
    concludeTurn() {
      counter.value += 1;
    },
  };
}

test('council_convene ends the turn silently by default', async () => {
  const { convene, agent } = createHarness('已记录议会消息 #1。\n已投递 1/1 位成员。');
  const counter = { value: 0 };
  const result = await convene.execute({ message: '新消息' }, execution(agent, counter));
  assert.equal(counter.value, 1);
  assert.match(result, /已投递 1\/1/);
  assert.match(result, /静默结束/);
});

test('silent:false lets an explicitly requested summary follow the relay', async () => {
  const { convene, agent } = createHarness('已记录议会消息 #1。\n已投递 1/1 位成员。');
  const counter = { value: 0 };
  const result = await convene.execute(
    { message: '新消息', silent: false },
    execution(agent, counter),
  );
  assert.equal(counter.value, 0);
  assert.match(result, /用户明确要求你发言/);
});

test('pending members keep the turn open for another relay call', async () => {
  const { convene, agent } = createHarness('已投递 1/2 位成员。', ['Codex']);
  const counter = { value: 0 };
  const result = await convene.execute({ message: '新消息' }, execution(agent, counter));
  assert.equal(counter.value, 0);
  assert.match(result, /仍有未送达成员：Codex/);
  assert.match(result, /继续用 council_convene 补齐/);
});

test('a failure with pending members reports instead of forcing a retry loop', async () => {
  const { convene, agent } = createHarness('已记录议会消息 #1。\n未送达：Codex：忙碌。', ['Codex']);
  const counter = { value: 0 };
  const result = await convene.execute({ message: '新消息' }, execution(agent, counter));
  assert.equal(counter.value, 0);
  assert.match(result, /只简要说明失败原因/);
  assert.doesNotMatch(result, /继续用 council_convene 补齐/);
});

test('a failed delivery is not force-silenced', async () => {
  const { convene, agent } = createHarness('已记录议会消息 #1。\n未送达：Codex：忙碌。');
  const counter = { value: 0 };
  const result = await convene.execute({ message: '新消息' }, execution(agent, counter));
  assert.equal(counter.value, 0);
  assert.match(result, /只简要说明失败原因/);
});
