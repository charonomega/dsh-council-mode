import assert from 'node:assert/strict';
import test from 'node:test';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRoomService, roomView, roomPrompt } from '../lib/room-service.js';
import { createRoomHost } from '../lib/room-host.js';
import { createRoomTools } from '../lib/room-tools.js';
import { createCouncilTools } from '../lib/tools.js';
import { createCouncilProjection } from '../lib/projection.js';
import { resolveConfig } from '../lib/config.js';
import { autonomousRoomItems } from '../lib/client-room.js';

const config = resolveConfig({});
const members = ['A', 'B', 'C'].map((id) => ({ workerId: id, name: id, roleName: '议员', kind: 'cliworker' }));
const flush = () => new Promise((resolve) => setImmediate(resolve));
function fixture(overrides = {}) {
  let saved = null;
  const parent = { id: 'parent' }, turns = [], writes = [];
  const service = createRoomService({ config, intervalMs: 0, owner: 'host-1',
    read: () => saved, write: async (_parent, room) => { saved = structuredClone(room); writes.push(room); },
    run: async (args) => {
      await args.accepted({ runId: `run-${turns.length}` });
      return new Promise((resolve, reject) => {
        args.signal.addEventListener('abort', () => reject(args.signal.reason), { once: true });
        turns.push({ ...args, finish: (result = { status: 'completed', text: '' }) => resolve(result) });
      });
    }, ...overrides });
  return { service, parent, turns, writes, get room() { return saved; }, set room(value) { saved = value; },
    identity: (turn) => ({ parent, roomId: turn.room.id, memberId: turn.member.workerId, deliveryId: turn.flight.deliveryId }),
    async tick() { await service.tick(); await flush(); for (const turn of turns) {
      if (!turn.inbox) turn.inbox = await service.inbox(this.identity(turn));
    } },
    async done(turn, result) {
      if (saved.protocol === 2 && saved.status === 'running' && !result && !saved.messages.some((m) => m.deliveryId === turn.flight.deliveryId)) await service.yield(this.identity(turn));
      turn.finish(result); await flush();
    },
  };
}

test('peers talk directly, busy members receive ordered batches and never echo to self', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '讨论', 'user-1'); await f.tick();
  assert.equal(f.turns.length, 3);
  const [a, b, c] = f.turns;
  const post = await f.service.post(f.identity(a), { to: 'B', content: 'B，请检查方案。', reply_to: 'user-1' }, 'a-1');
  await f.tick(); assert.equal(f.turns.length, 3, 'busy B must not be steered or duplicated');
  await f.done(a); await f.done(b); await f.done(c); await f.tick();
  assert.equal(f.turns.length, 4); const b2 = f.turns[3]; assert.equal(b2.member.workerId, 'B');
  assert.doesNotMatch(b2.prompt, /B，请检查方案/);
  assert.equal(b2.inbox.messages.length, 1);
  assert.equal(b2.inbox.messages[0].content, 'B，请检查方案。');
  const response = await f.service.post(f.identity(b2), { to: 'A', content: 'A，我认为约束还不够。', reply_to: post.messageId }, 'b-1');
  assert.deepEqual(response.recipients, ['A']);
  await f.done(b2); await f.tick(); assert.equal(f.turns.at(-1).member.workerId, 'A');
  await f.service.yield(f.identity(f.turns.at(-1)), '暂无新意见');
  await f.done(f.turns.at(-1)); await f.tick();
  assert.equal(f.room.status, 'idle'); assert.equal(f.room.messages.length, 3);
  assert.ok(f.writes.some((r) => r.deliveries.some((d) => d.status === 'sending')), 'write-ahead delivery exists');
});

test('concurrent posts have unique order, stable retries deduplicate but identical new text is retained', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '题目', 'u1'); await f.tick();
  const args = { to: 'all', content: '同样的文字' };
  const [a, b] = await Promise.all(f.turns.slice(0, 2).map((turn) => f.service.post(f.identity(turn), args, 'call-1')));
  assert.notEqual(a.seq, b.seq); assert.equal(f.room.messages.length, 3);
  assert.deepEqual(await f.service.post(f.identity(f.turns[0]), args, 'call-1'), a);
  await assert.rejects(f.service.post(f.identity(f.turns[0]), { ...args, content: '改写' }, 'call-1'), /不同内容/);
  await assert.rejects(f.service.post(f.identity(f.turns[0]), args, 'call-2'), /本轮已/);
});

test('private messages are absent from other prompts and reads, and private replies cannot expand recipients', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '公开', 'u1'); await f.tick();
  const [a, b, c] = f.turns;
  const post = await f.service.post(f.identity(a), { to: 'B', content: '定向内容' }, 'a1');
  assert.equal(f.service.read(f.identity(c)).messages.length, 1);
  assert.doesNotMatch(roomPrompt(f.room, members[2], []), /定向内容/);
  await assert.rejects(f.service.post(f.identity(c), { to: 'A', content: '偷看', reply_to: post.messageId }, 'c1'), /可见/);
  await assert.rejects(f.service.post(f.identity(b), { to: 'all', content: '扩散', reply_to: post.messageId }, 'b1'), /收件范围/);
  assert.equal(f.service.read(f.identity(b), 1, 1).messages[0].messageId, post.messageId);
});

test('yield suppresses final fallback and does not broadcast its acknowledgement', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members.slice(0, 2), '讨论', 'u1'); await f.tick();
  await f.service.yield(f.identity(f.turns[0]), '没有新观点');
  await f.done(f.turns[0], { status: 'completed', text: '已收到' });
  assert.equal(f.room.messages.length, 1);
  await assert.rejects(f.service.post(f.identity(f.turns[1]), { to: 'B', content: '自发自收' }, 'b1'), /自己/);
});

test('pause blocks new dispatch and late posts while truthfully retaining in-flight work', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '讨论', 'u1'); await f.tick();
  await f.service.control(f.parent, 'pause');
  assert.ok(f.room.deliveries.some((d) => d.status === 'accepted'));
  await assert.rejects(f.service.post(f.identity(f.turns[0]), { content: '晚到', to: 'all' }, 'a1'), /暂停/);
  await f.done(f.turns[0], { status: 'completed', text: '晚到的最终回复' });
  await f.tick(); assert.equal(f.room.messages.length, 1);
  await assert.rejects(f.service.input(f.parent, members, '新', 'u2', { fresh: true }), /当前轮/);
});

test('restart pauses active deliveries as uncertain and never retries before user reconciliation', async (t) => {
  const f = fixture();
  await f.service.input(f.parent, members, '讨论', 'u1'); await f.tick();
  const before = structuredClone(f.room); f.service.dispose();
  const restored = fixture({ owner: 'host-2' }); restored.room = before; t.after(() => restored.service.dispose());
  assert.equal(restored.service.snapshot(restored.parent).status, 'paused');
  assert.equal(restored.service.snapshot(restored.parent).deliveries[0].status, 'uncertain');
  await assert.rejects(restored.service.control(restored.parent, 'resume'), /未确认/);
  await restored.tick(); assert.equal(restored.turns.length, 0);
  for (const d of restored.room.deliveries) await restored.service.control(restored.parent, 'resolve', d.id, d.memberId === 'B' ? 'retry' : 'received');
  await restored.service.control(restored.parent, 'resume'); await restored.tick();
  assert.deepEqual(restored.turns.map((turn) => turn.member.workerId), ['B']);
});

test('unconfirmed admission pauses the room without automatically generating a new request', async (t) => {
  let calls = 0;
  const f = fixture({ run: async () => { calls++; throw new Error('reply lost after admission'); } }); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '讨论', 'u1'); await f.tick();
  assert.equal(f.room.status, 'paused'); assert.ok(f.room.deliveries.some((d) => d.status === 'uncertain'));
  const count = calls; await f.tick(); await f.tick(); assert.equal(calls, count);
});

test('new-topic retry is idempotent even after a lost command response', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  const first = await f.service.input(f.parent, members, '讨论', 'u1', { fresh: true });
  const second = await f.service.input(f.parent, members, '讨论', 'u1', { fresh: true });
  assert.deepEqual(second, first); assert.equal(f.room.messages.length, 1);
  await assert.rejects(f.service.input(f.parent, members, '别的讨论', 'u1', { fresh: true }), /不同内容/);
});

test('per-member budget stops endless peer ping-pong, and elapsed budget stops dispatch', async (t) => {
  const f = fixture({ config: resolveConfig({ maxMemberTurns: 1 }) }); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members.slice(0, 2), '讨论', 'u1'); await f.tick();
  await f.service.post(f.identity(f.turns[0]), { to: 'all', content: '继续' }, 'a1');
  await f.service.post(f.identity(f.turns[1]), { to: 'all', content: '继续' }, 'b1');
  await Promise.all(f.turns.map((turn) => f.done(turn))); await f.tick();
  assert.equal(f.room.status, 'paused'); assert.match(f.room.reason, /预算/); assert.equal(f.turns.length, 2);
  let now = 0; const g = fixture({ now: () => now }); t.after(() => g.service.dispose());
  await g.service.input(g.parent, members, '讨论', 'u1'); now = config.roomTimeoutMs + 1; await g.tick();
  assert.equal(g.turns.length, 0); assert.equal(g.room.status, 'paused');
});

test('room scheduler is created outside CLI tool AsyncLocalStorage, so native LLM is not forbidden', async (t) => {
  const als = new AsyncLocalStorage(); let seen = 'not-run';
  let resolveRun; const ran = new Promise((resolve) => { resolveRun = resolve; });
  const f = fixture({ intervalMs: 5, run: async () => { seen = als.getStore(); resolveRun(); return { status: 'completed' }; } });
  t.after(() => f.service.dispose());
  await als.run('cli-run', () => f.service.input(f.parent, members, '讨论', 'u1'));
  const timer = setTimeout(() => resolveRun(), 1000);
  await ran; clearTimeout(timer); assert.equal(seen, undefined);
});

test('unlimited mode crosses both count caps and disabling it restores accumulated counts', async (t) => {
  const f = fixture({ config: resolveConfig({ maxMemberTurns: 1, maxRoomMessages: 4 }) });
  t.after(() => f.service.dispose());
  await f.service.input(f.parent, members.slice(0, 2), '议题', 'u1'); await f.tick();
  for (const turn of f.turns) {
    await f.service.post(f.identity(turn), { content: '第一轮', to: 'all' }, 'p1'); await f.done(turn);
  }
  await f.service.input(f.parent, members, '达到第四条', 'u2'); await f.tick();
  assert.equal(f.room.status, 'paused');
  await assert.rejects(f.service.control(f.parent, 'resume'), /预算/);
  await f.service.control(f.parent, 'unlimited', 'on');
  assert.equal(f.room.status, 'paused', 'toggling must not start model work');
  assert.match(f.room.reason, /次数限制已取消/);
  await f.service.control(f.parent, 'unlimited', 'off');
  assert.match(f.room.reason, /已恢复次数限制/);
  await f.service.control(f.parent, 'unlimited', 'on');
  assert.match(f.room.reason, /次数限制已取消/);
  await f.service.control(f.parent, 'resume'); await f.tick();
  assert.equal(f.turns.length, 4, 'each original member receives a second wake');
  for (const turn of f.turns.slice(2)) {
    assert.equal(turn.inbox.limits.maxMessages, null);
    assert.equal(turn.inbox.limits.maxTurnsPerMember, null);
    assert.equal(turn.inbox.members, undefined, 'limit update does not replay the roster');
    await f.service.post(f.identity(turn), { content: '超出原消息预算', to: 'all' }, 'p2'); await f.done(turn);
  }
  assert.equal(f.room.messages.length, 6);
  const history = structuredClone(f.room.messages);
  await f.service.control(f.parent, 'unlimited', 'off'); await f.tick();
  assert.equal(f.room.status, 'paused'); assert.equal(f.turns.length, 4);
  assert.deepEqual(f.room.messages, history);
  assert.equal(f.room.limits.maxMessages, 4); assert.equal(f.room.limits.maxTurnsPerMember, 1);
  await assert.rejects(f.service.control(f.parent, 'resume'), /预算/);
});

test('unlimited flag survives projection and cold recovery while new topics default to bounded', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '议题', 'u');
  assert.equal(f.room.unlimited, false);
  await assert.rejects(f.service.control(f.parent, 'unlimited', 'invalid'), /on\|off/);
  await f.service.control(f.parent, 'unlimited', 'on');
  const projection = createCouncilProjection(config, 'new-host');
  const state = projection.apply(projection.init(), { type: 'plugin:council/room', ignorable: true, data: { room: f.room } });
  const view = projection.wire.view(state);
  assert.equal(view.room.unlimited, true); assert.equal(view.room.status, 'paused');
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);
  await f.service.input(f.parent, members, '新议题', 'u2', { fresh: true });
  assert.equal(f.room.unlimited, false);
});

test('unlimited counts retain the time, statement length and manual stop boundaries', async (t) => {
  let now = 0; const f = fixture({ now: () => now }); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '议题', 'u');
  await f.service.control(f.parent, 'unlimited', 'on'); await f.tick();
  await assert.rejects(f.service.post(f.identity(f.turns[0]), { content: 'x'.repeat(config.statementLimit + 1) }, 'long'), /发言须/);
  now = config.roomTimeoutMs + 1; await f.tick();
  assert.equal(f.room.status, 'paused'); assert.match(f.room.reason, /时间/);
  await f.service.control(f.parent, 'stop');
  await assert.rejects(f.service.control(f.parent, 'unlimited', 'on'), /已结束/);
  assert.equal(f.room.status, 'stopped');
});

test('restoring limits during a readiness wait prevents a stale unlimited dispatch', async (t) => {
  let waiting = false, entered, release;
  const reached = new Promise((resolve) => { entered = resolve; });
  const f = fixture({ config: resolveConfig({ maxMemberTurns: 1 }),
    ready: async () => { if (waiting) { entered(); await new Promise((resolve) => { release = resolve; }); } return true; } });
  t.after(() => f.service.dispose());
  await f.service.input(f.parent, members.slice(0, 2), '给 A', 'u', { recipients: ['A'] });
  await f.service.control(f.parent, 'unlimited', 'on'); await f.tick(); await f.done(f.turns[0]);
  await f.service.input(f.parent, members, '再次给 A', 'u2', { recipients: ['A'] });
  waiting = true; const tick = f.service.tick(); await reached;
  await f.service.control(f.parent, 'unlimited', 'off');
  assert.equal(f.room.status, 'running', 'B still has unused quota');
  release(); await tick; await flush();
  assert.equal(f.turns.length, 1); assert.equal(f.room.status, 'paused');
});

test('CLI authors require the exact live child and current run binding; caller cannot choose author', async () => {
  const parent = { id: 'p' }, child = { id: 'child' };
  const worker = { runId: 'r1', harnessConversation: { sessionId: 'child' }, status: 'running' };
  const registry = new Map([['p', parent], ['child', child]]);
  const cli = { harnessConversation: { lookup: () => ({ parentSessionId: 'p', workerId: 'A' }) }, runtime: { get: () => worker } };
  const host = createRoomHost({ ctx: { get: (name) => name === 'agents' ? registry : cli }, config });
  host.attach({ flight: () => ({ runId: 'r1', roomId: 'room', deliveryId: 'd1' }) });
  assert.deepEqual(await host.identify(child), { parent, roomId: 'room', memberId: 'A', deliveryId: 'd1' });
  await assert.rejects(host.identify({ id: 'child' }), /真实/);
  worker.runId = 'r2'; await assert.rejects(host.identify(child), /过期/);
  const tools = createRoomTools({}, host);
  assert.equal(tools.post.parameters.properties.author, undefined);
  assert.equal(tools.post.parameters.additionalProperties, false);
});

test('projection replay preserves room history and lossless JSON; canonical UI has no tool echoes', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '讨论', 'u1'); await f.tick();
  await f.service.post(f.identity(f.turns[0]), { to: 'B', content: '定向发言' }, 'a1');
  const projection = createCouncilProjection(config, 'host-1'); let state = projection.init();
  for (const room of f.writes) state = projection.apply(state, { type: 'plugin:council/room', ignorable: true, data: { room } });
  const view = projection.wire.view(state);
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);
  const rows = autonomousRoomItems(view.room).filter((row) => row.type === 'message');
  assert.equal(rows.length, 2); assert.match(rows[1].routeLabel, /→ B/);
  assert.equal(state.room.deliveries.length, 3); assert.equal(view.room.messages.length, 2);
  assert.equal(roomView(view.room, 'other-host').status, 'paused');
});

test('CLI structured exit preserves recipient/reply identity; pseudo-tool text is never broadcast', async (t) => {
  const f = fixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '讨论', 'u1'); await f.tick();
  f.room.protocol = 1; // Historical rooms retain their structured-final compatibility.
  await f.done(f.turns[0], { status: 'completed', text: JSON.stringify({ action: 'post', to: 'B', content: '定向回复', reply_to: 'u1' }) });
  assert.deepEqual(f.room.messages[1].recipients, ['B']); assert.equal(f.room.messages[1].replyTo, 'u1');
  await f.done(f.turns[1], { status: 'completed', text: JSON.stringify({ action: 'yield', reason: '结束' }) });
  assert.equal(f.room.messages.length, 2);
  await f.done(f.turns[2], { status: 'completed', text: 'council_yield(reason="收到")' });
  assert.equal(f.room.messages.length, 2); assert.equal(f.room.status, 'paused');
  assert.equal(f.room.deliveries.at(-1).status, 'failed');
});

test('CLI job is collected at registration before settlement and unrelated job notifications are untouched', async () => {
  let listener; const waited = [];
  const jobs = { events: { subscribe: (_filter, fn) => { listener = fn; return () => {}; } },
    wait: async (id, _timeout, parentId) => { waited.push([id, parentId]); } };
  const parent = { id: 'p' }, flight = { deliveryId: '12345678-1234-1234-1234-123456789abc' };
  const cli = { submitMessage: async (_parent, _member, raw) => {
    const request = JSON.parse(raw);
    listener({ type: 'registered', job: { id: 'j1', kind: 'cliworker', owner: 'p', label: request.prompt.slice(0, 100) } });
    assert.deepEqual(waited, [['j1', 'p']], 'waiter must exist before the submit receipt is returned');
    return { runId: 'r1' };
  } };
  const ctx = { get: (key) => ({ jobs, cliworker: cli }[key]), effect: (fn) => fn() };
  const adapter = { async *watch() { yield { selected: { runId: 'old', status: 'completed' } }; yield { selected: { runId: 'r1', status: 'completed' }, timeline: [] }; } };
  const host = createRoomHost({ ctx, adapter, config }); host.attach({});
  const result = await host.run({ parent, member: members[0], room: { epoch: 'epoch', deliveries: [1] }, prompt: 'test', flight, accepted: async () => {}, signal: new AbortController().signal });
  assert.equal(result.status, 'completed');
  listener({ type: 'registered', job: { id: 'other', kind: 'cliworker', owner: 'p', label: 'ordinary task' } });
  assert.equal(waited.length, 1); host.dispose();
});

test('UI retains a failed command draft by exposing nested native command results', async () => {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../client-src/state.js', import.meta.url), 'utf8'), context);
  const ctx = { remote: { commands: { execute: async () => ({ ok: true, value: { commandId: 'c', result: { kind: 'error', text: 'paused' } } }) } } };
  assert.equal(await context.executeCommand(ctx, 'p', '/council say test'), 'paused');
});

test('execution assignments wait for the autonomous topic and every in-flight receipt to settle', async () => {
  const agent = { id: 'p', session: { header: { origin: 'user' } }, ctx: { get: () => undefined } };
  const state = { active: true, members };
  let room = { status: 'running', deliveries: [] }, assignments = 0;
  const { assign } = createCouncilTools({ ctx: { sessionProjections: { stateOf: () => state } }, config,
    rooms: { snapshot: () => room }, engine: { assign: async () => { assignments++; return 'done'; } } });
  const args = { assignments: [{ member: 'A', task: '实施方案' }] }, exec = { agent };
  await assert.rejects(assign.execute(args, exec), /先结束自主议题/);
  room = { status: 'stopped', deliveries: [{ status: 'accepted' }] };
  await assert.rejects(assign.execute(args, exec), /等待/);
  room.deliveries[0].status = 'uncertain';
  await assert.rejects(assign.execute(args, exec), /核对/);
  assert.equal(assignments, 0);
  room.deliveries[0].status = 'completed';
  assert.equal(await assign.execute(args, exec), 'done'); assert.equal(assignments, 1);
});
