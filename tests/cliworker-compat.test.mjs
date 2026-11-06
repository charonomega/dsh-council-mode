import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createCliWorkerAdapter, cliWorkerCompatibilityIssue, parseCliWorkerSnapshot, cliWorkerBusy, cliWorkerOutcome } from '../lib/adapter.js';
import { createRoomHost } from '../lib/room-host.js';
import { createRoomService } from '../lib/room-service.js';
import { createCouncilEngine } from '../lib/engine.js';
import { createRelayLog } from '../lib/relay-log.js';
import { resolveConfig } from '../lib/config.js';

const config = resolveConfig({});
const parent = { id: 'p' };
const member = { kind: 'cliworker', workerId: 'w', name: 'Worker', roleId: 'reviewer' };
const worker = (extra = {}) => ({ id: 'w', parentSessionId: 'p', runId: 'old', status: 'completed', mode: 'plan', ...extra });
const snapshot = (extra = {}) => ({ workers: [worker()], selected: worker(), timeline: [], revision: 1, ...extra });

function fixture(frames = [snapshot()]) {
  const calls = [];
  const cli = {
    async *watch() { yield* frames; },
    async followup(...args) { calls.push(args); return JSON.stringify({ workerId: 'w', runId: 'new' }); },
    async submitMessage(...args) { calls.push(args); return JSON.stringify({ workerId: 'w', runId: 'new' }); },
    runtime: { get: () => worker() },
    harnessConversation: { lookup: () => undefined },
  };
  const services = { cliworker: cli, agents: new Map([['p', parent]]), jobs: { events: {} } };
  const ctx = { get: (name) => services[name] };
  const adapter = createCliWorkerAdapter(ctx);
  const host = createRoomHost({ ctx, adapter, config });
  return { cli, services, calls, adapter, host, ctx };
}

function run(host, signal = new AbortController().signal) {
  return host.run({ parent, member, room: { epoch: 'room-epoch', deliveries: [1] },
    flight: { deliveryId: 'delivery' }, prompt: 'council_inbox', accepted: async () => {}, signal });
}

test('the capability gate checks the actual CLI surface and reports missing methods', () => {
  const f = fixture();
  assert.equal(cliWorkerCompatibilityIssue(f.cli), null);
  assert.equal(f.adapter.isAvailable(), true);
  delete f.cli.submitMessage;
  assert.match(f.adapter.compatibilityIssue(), /submitMessage/);
  assert.equal(f.adapter.isAvailable(), false);
  assert.throws(() => f.adapter.assertCompatible(), /缺少议会所需接口/);
  assert.doesNotMatch(f.adapter.compatibilityIssue(), /登录/);
});

test('legacy JSON and current object snapshots preserve fields and optional busy state', async () => {
  const legacy = snapshot();
  const current = snapshot({ selectedBusy: true, selectedBusyReason: 'preparing', externalTurnUsage: { total: 12 } });
  const f = fixture([JSON.stringify(legacy), current]);
  const values = [];
  for await (const value of f.adapter.watch('p', 'w', new AbortController().signal)) values.push(value);
  assert.deepEqual(values, [legacy, current]);
  assert.equal(cliWorkerBusy(values[0]), false);
  assert.equal(cliWorkerBusy(values[1]), true);
});

test('scrubbed real CLI Worker 0.8.2 snapshots retain their wire representation', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/cliworker-growing-rows.json', import.meta.url), 'utf8'));
  assert(fixture.snapshots.length > 0);
  for (const snapshot of fixture.snapshots) {
    assert.deepEqual(parseCliWorkerSnapshot(JSON.stringify(snapshot)), snapshot);
  }
});

test('malformed snapshots fail explicitly instead of silently producing an empty roster', async () => {
  for (const value of ['not json', '{}', { workers: 'wrong' }, snapshot({ timeline: {} }), snapshot({ selectedBusy: 'yes' })]) {
    const f = fixture([value]);
    await assert.rejects(f.adapter.listWorkers('p', new AbortController().signal), /CLI Worker/);
    assert.equal(f.calls.length, 0);
  }
  assert.throws(() => parseCliWorkerSnapshot(snapshot({ selected: worker({ status: 'new-upstream-status' }) })), /状态无法确认/);
});

test('watch validates its iterable and selected member identity', async () => {
  const f = fixture();
  f.cli.watch = () => ({ frames: [] });
  await assert.rejects(f.adapter.snapshotOnce('p', 'w'), /异步快照流/);
  f.cli.watch = async function* () { yield snapshot({ selected: worker({ id: 'other' }) }); };
  await assert.rejects(f.adapter.snapshotOnce('p', 'w'), /成员与请求不一致/);
});

test('a reloaded service is checked afresh without borrowing a previous service capability', async () => {
  const f = fixture();
  await f.adapter.listWorkers('p');
  f.services.cliworker = { watch: f.cli.watch, followup: f.cli.followup };
  await assert.rejects(f.adapter.listWorkers('p'), /submitMessage.*runtime.get.*harnessConversation.lookup/);
});

test('a room readiness check waits for accepting, preparing and cleanup occupancy', async () => {
  for (const reason of ['accepting', 'preparing', 'queued', 'stopping', 'priority']) {
    const f = fixture([snapshot({ selectedBusy: true, selectedBusyReason: reason })]);
    assert.equal(await f.host.ready(parent, member), false, reason);
    assert.equal(f.calls.length, 0);
  }
  const f = fixture([snapshot()]);
  assert.equal(await f.host.ready(parent, member), true);
});

test('a busy first frame or malformed first frame cannot submit a room message', async () => {
  const occupied = fixture([snapshot({ selectedBusy: true, selectedBusyReason: 'preparing' })]);
  assert.equal((await run(occupied.host)).status, 'uncertain');
  assert.equal(occupied.calls.length, 0);
  const invalid = fixture(['not-json']);
  await assert.rejects(run(invalid.host), /无效 JSON/);
  assert.equal(invalid.calls.length, 0);
});

test('room completion waits for cleanup and uses the final matching run output', async () => {
  const f = fixture([
    snapshot(),
    snapshot({ selected: worker({ runId: 'new' }), selectedBusy: true, timeline: [{ runId: 'new', kind: 'result', text: 'partial' }] }),
    snapshot({ selected: worker({ runId: 'new' }), selectedBusy: false, timeline: [{ runId: 'new', kind: 'result', text: 'complete' }] }),
  ]);
  const result = await run(f.host);
  assert.equal(result.status, 'completed');
  assert.equal(result.text, 'complete');
  assert.equal(f.calls.length, 1);
  const submitted = JSON.parse(f.calls[0][2]);
  assert.equal(submitted.id, 'delivery');
  assert.equal(submitted.expectedRunId, 'old');
});

test('uncertain CLI completion remains uncertain and blocks room resume until reconciliation', async (t) => {
  const f = fixture([snapshot(), snapshot({ selected: worker({ runId: 'new', status: 'uncertain', error: 'verify result' }) })]);
  const result = await run(f.host);
  assert.equal(result.status, 'uncertain');
  let saved;
  const room = createRoomService({ config, intervalMs: 0, read: () => saved,
    write: async (_parent, value) => { saved = structuredClone(value); }, run: async () => result });
  t.after(() => room.dispose());
  await room.input(parent, [member, { ...member, workerId: 'w2' }], 'topic', 'message');
  await room.tick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(saved.status, 'paused');
  assert(saved.deliveries.some((delivery) => delivery.status === 'uncertain'));
  await assert.rejects(room.control(parent, 'resume'), /未确认/);
});

test('assignment completion uses selectedBusy and retains uncertain outcomes', async () => {
  for (const final of ['completed', 'uncertain']) {
    const f = fixture([
      snapshot(),
      snapshot({ selected: worker({ runId: 'new', status: final }), selectedBusy: true, timeline: [{ runId: 'new', kind: 'result', text: 'partial' }] }),
      snapshot({ selected: worker({ runId: 'new', status: final }), selectedBusy: false, timeline: [{ runId: 'new', kind: 'result', text: 'final' }] }),
    ]);
    const result = JSON.parse(await createCouncilEngine({ adapter: f.adapter, config }).assign({
      parentSessionId: 'p', members: [member], assignments: [{ member: 'w', task: 'read' }], signal: new AbortController().signal,
    }));
    assert.equal(result.results[0].status, final);
    assert.equal(result.results[0].text, 'final');
    assert.equal(f.calls.length, 1);
  }
});

test('uncertain, cancelled and unknown outcomes cannot be reported as completed', () => {
  assert.equal(cliWorkerOutcome('uncertain'), 'uncertain');
  assert.equal(cliWorkerOutcome('interrupted'), 'cancelled');
  assert.equal(cliWorkerOutcome('future-terminal'), 'uncertain');
});

test('unconfirmed or aborted submission is never retried by the adapter', async () => {
  const f = fixture();
  f.cli.submitMessage = async (...args) => { f.calls.push(args); return '{"accepted":true}'; };
  await assert.rejects(f.adapter.submitMessage('p', 'w', {}, new AbortController().signal), /不会自动重发/);
  assert.equal(f.calls.length, 1);
  const controller = new AbortController();
  f.cli.submitMessage = (...args) => { f.calls.push(args); queueMicrotask(() => controller.abort(new Error('cancelled'))); return new Promise(() => {}); };
  await assert.rejects(f.adapter.submitMessage('p', 'w', {}, controller.signal), /cancelled/);
  assert.equal(f.calls.length, 2);
});

test('archived parent and native members fail room readiness and later dispatch without changing archive state', async () => {
  const native = { kind: 'subagent', sessionId: 'n', name: 'Native' };
  for (const [archivedId, target, reason] of [['p', member, /主会话已归档/], ['n', native, /原生成员 Native 已归档/]]) {
    const f = fixture();
    f.services.workspaceRegistry = { archivedSessionIds: [archivedId] };
    await assert.rejects(f.host.ready(parent, target), reason);
    const result = await f.host.run({ parent, member: target });
    assert.equal(result.status, 'failed');
    assert.match(result.error, reason);
    assert.equal(f.calls.length, 0);
    assert.deepEqual(f.services.workspaceRegistry.archivedSessionIds, [archivedId]);
  }
});

test('the opening all-member barrier prevents a CLI launch when the native member is archived', async (t) => {
  const f = fixture();
  f.services.workspaceRegistry = { archivedSessionIds: ['n'] };
  let saved, dispatched = 0;
  const room = createRoomService({ config, intervalMs: 0, read: () => saved,
    write: async (_parent, value) => { saved = structuredClone(value); }, ready: f.host.ready,
    run: async () => { dispatched++; return { status: 'completed' }; } });
  t.after(() => room.dispose());
  await room.input(parent, [member, { kind: 'subagent', sessionId: 'n', name: 'Native' }], 'topic', 'message');
  await room.tick();
  assert.equal(saved.status, 'paused');
  assert.match(saved.reason, /原生成员 Native 已归档/);
  assert.equal(saved.deliveries.length, 0);
  assert.equal(dispatched, 0);
});

test('archiving during CLI preparation blocks submission while an admitted task can still complete', async () => {
  const preparing = fixture();
  preparing.services.workspaceRegistry = { archivedSessionIds: [] };
  preparing.cli.watch = async function* () {
    preparing.services.workspaceRegistry.archivedSessionIds.push('p');
    yield snapshot();
  };
  const blocked = await run(preparing.host);
  assert.equal(blocked.status, 'failed');
  assert.match(blocked.error, /主会话已归档/);
  assert.equal(preparing.calls.length, 0);

  const admitted = fixture([snapshot(), snapshot({ selected: worker({ runId: 'new' }) })]);
  admitted.services.workspaceRegistry = { archivedSessionIds: [] };
  const submit = admitted.cli.submitMessage;
  admitted.cli.submitMessage = async (...args) => {
    const receipt = await submit(...args);
    admitted.services.workspaceRegistry.archivedSessionIds.push('p');
    return receipt;
  };
  assert.equal((await run(admitted.host)).status, 'completed');
  assert.equal(admitted.calls.length, 1);
});

test('archiving during native resume prevents followup and keeps the idle handle releasable', async () => {
  const f = fixture();
  f.services.workspaceRegistry = { archivedSessionIds: [] };
  f.services.subagents = { listChildren: async () => [{ id: 'n', mode: 'continuable' }] };
  let sent = 0, disposed = 0;
  f.services.agents.resume = async () => {
    f.services.workspaceRegistry.archivedSessionIds.push('n');
    return { agent: { id: 'n', status: 'idle', session: { seq: 0 }, followup: () => sent++ },
      dispose: async () => { disposed++; } };
  };
  const host = createRoomHost({ ctx: f.ctx, adapter: f.adapter, config, nativeOptions: async () => ({}) });
  const result = await host.run({ parent, member: { kind: 'subagent', sessionId: 'n', name: 'Native' },
    room: { id: 'room' }, flight: { executionId: 'n', deliveryId: 'delivery' }, prompt: 'inbox',
    accepted: async () => assert.fail('an archived child must not accept a message'), signal: new AbortController().signal });
  assert.equal(result.status, 'failed');
  assert.match(result.error, /原生成员 Native 已归档/);
  assert.equal(sent, 0);
  await host.release('p');
  assert.equal(disposed, 1);
});

test('legacy dispatch entries reject archived sessions before any worker call', async () => {
  const f = fixture();
  f.services.workspaceRegistry = { archivedSessionIds: ['p'] };
  const engine = createCouncilEngine({ adapter: f.adapter, config, ctx: f.ctx });
  const options = { parentSessionId: 'p', members: [member], signal: new AbortController().signal };
  await assert.rejects(engine.relay({ ...options, message: 'topic' }), /主会话已归档/);
  await assert.rejects(engine.convene({ ...options, topic: 'topic' }), /主会话已归档/);
  await assert.rejects(engine.assign({ ...options, assignments: [{ member: 'w', task: 'read' }] }), /主会话已归档/);
  f.services.workspaceRegistry.archivedSessionIds = ['n'];
  await assert.rejects(engine.relay({ ...options, members: [member, { kind: 'subagent', sessionId: 'n', name: 'Native' }], message: 'topic' }), /原生成员 Native 已归档/);
  assert.equal(f.calls.length, 0);
});

test('archiving during legacy write-ahead keeps an unsubmitted delivery pending with its reason', async () => {
  const f = fixture();
  f.services.workspaceRegistry = { archivedSessionIds: [] };
  const relayLog = createRelayLog(), mark = relayLog.mark;
  relayLog.mark = async (...args) => {
    await mark(...args);
    if (args[3] === 'sending') f.services.workspaceRegistry.archivedSessionIds.push('p');
  };
  const engine = createCouncilEngine({ adapter: f.adapter, config, ctx: f.ctx, relayLog });
  const result = await engine.relay({ parentSessionId: 'p', members: [member], message: 'topic', signal: new AbortController().signal });
  assert.match(result, /主会话已归档/);
  assert.equal(f.calls.length, 0);
  assert.equal(relayLog.uncertain('p', 'w').length, 0);
  assert.equal(relayLog.pending('p', 'w').length, 1);
});
