import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomService } from '../lib/room-service.js';
import { createRoomHost } from '../lib/room-host.js';
import { invitationIssue, READY_PROMPT } from '../lib/member-protocol.js';
import { resolveConfig } from '../lib/config.js';

const config = resolveConfig({});
const members = ['a', 'b'].map((id) => ({ kind: 'subagent', sessionId: id, name: id, roleName: '成员' }));
const flush = () => new Promise((r) => setImmediate(r));
function roomFixture(extra = {}) {
  let saved; const turns = [], parent = { id: 'p', status: 'idle' };
  const service = createRoomService({ config, intervalMs: 0,
    read: () => saved, write: async (_p, r) => { saved = structuredClone(r); },
    run: async (args) => { await args.accepted({}); return new Promise((resolve) => turns.push({ ...args, finish: resolve })); }, ...extra });
  return { service, parent, turns, get room() { return saved; },
    identity: (turn) => ({ parent, roomId: turn.room.id, memberId: turn.member.sessionId, deliveryId: turn.flight.deliveryId }),
    async tick() { await service.tick(); await flush(); },
  };
}

test('opening waits for the published brief, the chair turn and ALL ready members', async (t) => {
  let waiting = 'b'; const f = roomFixture({ ready: async (_p, m) => m.sessionId !== waiting });
  t.after(() => f.service.dispose());
  f.parent.status = 'running';
  await f.service.input(f.parent, members, '完整结构化讨论要求', 'brief');
  assert.equal(f.room.messages[0].content, '完整结构化讨论要求');
  await f.tick(); assert.equal(f.turns.length, 0);
  f.parent.status = 'idle'; await f.tick(); assert.equal(f.turns.length, 0, 'ready A must also wait for B');
  waiting = ''; await f.tick(); assert.equal(f.turns.length, 2);
  assert.ok(f.room.openedAt >= f.room.messages[0].createdAt);
  assert.deepEqual(f.room.deliveries.map((d) => d.executionId), ['a', 'b']);
});

test('invitation guard rejects an early debate for both providers but preserves normal tools', () => {
  for (const name of ['subagent', 'cliworker_start']) {
    assert.match(invitationIssue({ name, arguments: { prompt: '先写出你对议题的立场' } }), /邀请阶段/);
    assert.equal(invitationIssue({ name, arguments: { prompt: READY_PROMPT } }), undefined);
  }
  assert.equal(invitationIssue({ name: 'read', arguments: {} }), undefined);
});

test('notifications carry no transcript; each inbox returns only its immutable addressed batch', async (t) => {
  const f = roomFixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, '首条要求-SECRET-BRIEF', 'brief'); await f.tick();
  const [a, b] = f.turns;
  assert.doesNotMatch(a.prompt, /SECRET-BRIEF/);
  assert.match(a.prompt, /DSH 的 skill 工具/);
  await assert.rejects(f.service.post(f.identity(a), { to: 'all', content: '绕过收件箱' }, 'no-read'), /先调用/);
  const first = await f.service.inbox(f.identity(a));
  assert.equal(first.messages[0].content, '首条要求-SECRET-BRIEF'); assert.ok(first.members);
  assert.deepEqual(await f.service.inbox(f.identity(a)), first, 'read retry is stable');
  await f.service.inbox(f.identity(b));
  await f.service.post(f.identity(a), { to: 'b', content: '同伴原文-PEER', reply_to: 'brief' }, 'a1');
  const bFirst = await f.service.inbox(f.identity(b));
  assert.equal(bFirst.messages.length, 1, 'late arrival belongs to next batch');
  await f.service.yield(f.identity(b));
  for (const turn of [a, b]) turn.finish({ status: 'completed' });
  await flush(); await f.tick();
  const b2 = f.turns[2];
  assert.doesNotMatch(b2.prompt, /SECRET-BRIEF|PEER|dsh-council-member/);
  const inbox = await f.service.inbox(f.identity(b2));
  assert.equal(inbox.members, undefined);
  assert.deepEqual(inbox.messages.map((m) => [m.authorMemberId, m.content]), [['a', '同伴原文-PEER']]);
  assert.equal(inbox.messages[0].messageId, f.room.messages[1].messageId);
  assert.deepEqual(f.room.deliveries.at(-1).readMessageIds, [f.room.messages[1].messageId]);
});

test('new protocol never broadcasts final text or JSON instead of an actual post tool', async (t) => {
  const f = roomFixture(); t.after(() => f.service.dispose());
  await f.service.input(f.parent, members, 'topic', 'u'); await f.tick();
  await f.service.inbox(f.identity(f.turns[0]));
  f.turns[0].finish({ status: 'completed', text: '{"action":"post","content":"fake","to":"all"}' });
  await flush(); assert.equal(f.room.messages.length, 1); assert.equal(f.room.status, 'paused');
});

test('native member resumes its original session once and retains the exact agent across turns', async () => {
  const parent = { id: 'p' }, registry = new Map([['p', parent]]), inputs = [], events = [], receipts = [];
  let resumes = 0, disposed = 0, starts = 0;
  const child = { id: 'a', status: 'idle', session: { header: { origin: 'subagent', parentSession: 'p' },
    get seq() { return events.length; }, snapshotEvents: (start) => events.slice(start) },
    followup(message) { inputs.push(message); this.status = 'running'; },
    async whenIdle() { events.push({ type: 'turn/end', data: { reason: { kind: 'completed' } } }); this.status = 'idle'; },
  };
  registry.resume = async (args) => { resumes++; assert.equal(args.resumeSessionId, 'a'); registry.set('a', child);
    return { agent: child, dispose: async () => { disposed++; registry.delete('a'); } }; };
  const services = { agents: registry, sessions: { flush: async () => {} }, subagents: {
    listChildren: async () => [{ id: 'a', mode: 'continuable' }], startActivation: () => { starts++; throw new Error('must not spawn'); },
  } };
  const host = createRoomHost({ ctx: { get: (key) => services[key] }, config, nativeOptions: async () => ({}) });
  let current;
  host.attach({ flight: () => current });
  for (const n of [1, 2, 3]) {
    current = { executionId: 'a', deliveryId: `d${n}`, roomId: 'room' };
    const result = await host.run({ parent, member: members[0], room: { id: 'room' }, flight: current,
      prompt: `council_inbox: ${n}`, signal: new AbortController().signal, accepted: async (r) => receipts.push(r) });
    assert.equal(result.status, 'completed'); assert.equal(registry.get('a'), child); assert.equal(disposed, 0);
  }
  assert.equal(resumes, 1); assert.equal(starts, 0); assert.equal(inputs.length, 3);
  assert.equal(new Set(receipts.map((r) => r.executionId)).size, 1);
  assert.equal(new Set(receipts.map((r) => r.messageId)).size, 3);
  await host.release('p'); assert.equal(disposed, 1);
  await host.dispose();
});
