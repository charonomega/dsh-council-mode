import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createCouncilEngine } from '../lib/engine.js';
import { createCouncilTools } from '../lib/tools.js';
import { createCouncilProjection } from '../lib/projection.js';
import { createRelayLog, reduceRelayRecord } from '../lib/relay-log.js';
import { canonicalScope, scopesOverlap, resolveMember } from '../lib/members.js';
import { mergeTimelineItems } from '../lib/client-room.js';

const config = { maxMembers: 6, maxRounds: 2, statementLimit: 1000, maxDigestChars: 8000, assignmentTimeoutMs: 200, roundTimeoutMs: 200 };
const signal = new AbortController().signal;
const parent = { id: 'p', session: { header: { origin: 'user', cwd: process.cwd() } }, ctx: { get() {} } };
const execution = { agent: parent, signal, concludeTurn() {} };
const member = (id, extra = {}) => ({ workerId: id, name: id, roleId: 'engineer', roleName: '工程师', ...extra });
const native = (id) => member(id, { kind: 'subagent', sessionId: id });
function nativeContext(children = ['n'], permission = 'read-only') {
  const sent = [];
  const service = { async listChildren() { return children.map((id) => ({ id, mode: 'continuable' })); }, async sendMessage(_sender, id) { sent.push(id); return `receipt-${id}`; } };
  return { sent, get(name) {
    if (name === 'subagents') return service;
    if (name === 'agents') return { get(id) { return children.includes(id) ? { session: { header: { origin: 'subagent', parentSession: 'p' } }, ctx: { get() { return { resolve() { return { mode: permission }; } }; } } } : undefined; } };
  } };
}
function harness(members, adapter = {}, engine = {}, context = {}) {
  const projection = createCouncilProjection(config);
  let state = { ...projection.init(), active: true, members };
  const ctx = { ...context, get: context.get ?? (() => undefined), sessionProjections: { stateOf: () => state } };
  return { projection, get state() { return state; }, fold(event) { state = projection.apply(state, event); }, tools: createCouncilTools({ config, ctx, adapter, engine }) };
}
class Recorder {
  calls = [];
  async followup(_p, id, prompt) { this.calls.push({ id, prompt }); return { runId: 'receipt' }; }
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('F1: real folded rows without runId produce the matching completed result', async () => {
  const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/cliworker-0.8.2-folded.json', import.meta.url)));
  assert(fixture.rows.every((row) => row.runId === undefined));
  const worker = { id: 'a', mode: 'plan', status: 'completed', runId: 'old' };
  const adapter = {
    async listWorkers() { return { workers: [worker] }; },
    async followup() { return { runId: fixture.runId }; },
    async *watch() {
      yield { selected: worker, timeline: [] };
      yield { selected: { ...worker, runId: 'another-run' }, timeline: [{ kind: 'assistant', text: 'WRONG', runId: 'another-run' }] };
      yield { selected: { ...worker, runId: fixture.runId }, timeline: fixture.rows };
    },
  };
  const result = JSON.parse(await createCouncilEngine({ adapter, config }).assign({ parentSessionId: 'p', members: [member('a')], assignments: [{ member: 'a', task: 'read' }], signal }));
  assert.equal(result.results[0].status, 'completed');
  assert.equal(result.results[0].runId, fixture.runId);
  assert.match(result.results[0].text, /RESULT_OK/);
  assert.doesNotMatch(result.results[0].text, /WRONG/);
});

test('F1: failed run with readable partial output is still failed', async () => {
  const worker = { id: 'a', mode: 'plan', status: 'completed', runId: 'old' };
  const adapter = { async listWorkers() { return { workers: [worker] }; }, async followup() { return { runId: 'target' }; }, async *watch() {
    yield { selected: worker };
    yield { selected: { ...worker, runId: 'target', status: 'failed', error: 'exit 1' }, timeline: [{ runId: 'target', kind: 'assistant', text: 'partial' }] };
  } };
  const result = JSON.parse(await createCouncilEngine({ adapter, config }).assign({ parentSessionId: 'p', members: [member('a')], assignments: [{ member: 'a', task: 'read' }], signal }));
  assert.equal(result.results[0].status, 'failed');
  assert.equal(result.results[0].text, 'partial');
});

test('F2: selective relay has no phantom pending recipient and never leaks on retry', async () => {
  const adapter = new Recorder(), engine = createCouncilEngine({ adapter, config });
  const h = harness([member('a'), member('b')], adapter, engine);
  const first = await h.tools.convene.execute({ members: 'a', message: 'private-to-a' }, execution);
  assert.doesNotMatch(first, /仍有未送达成员/);
  await h.tools.convene.execute({}, execution);
  assert.deepEqual(adapter.calls.map((call) => call.id), ['a']);
});

test('F3: native admission is accepted, mixed tool results retain individual statuses', async () => {
  const ctx = nativeContext();
  const data = JSON.parse(await createCouncilEngine({ adapter: {}, config, ctx }).assign({ parentSessionId: 'p', parentAgent: parent, members: [native('n')], assignments: [{ member: 'n', task: 'read' }], signal }));
  assert.equal(data.results[0].status, 'accepted');
  assert.doesNotMatch(data.report, /：完成/);
  const h = harness([]);
  h.fold({ type: 'tool/call', data: { name: 'council_assign', callId: 'c', arguments: JSON.stringify({ assignments: [{ member: 'n', task: 'read' }, { member: 'f', task: 'fail' }] }) } });
  h.fold({ type: 'tool/result', data: { message: { toolCallId: 'c', content: [{ type: 'text', text: JSON.stringify({ results: [...data.results, { member: 'f', status: 'failed', error: 'failure' }] }) }] } } });
  assert.deepEqual(h.state.assignments.map((item) => item.status), ['accepted', 'failed']);
  h.fold({ type: 'tool/call', data: { name: 'council_convene', callId: 'relay', arguments: '{}' } });
  h.fold({ type: 'tool/result', data: { message: { toolCallId: 'relay', content: [{ type: 'text', text: '已投递' }] } } });
  assert.deepEqual(h.state.assignments.map((item) => item.status), ['accepted', 'failed']);
});

test('F4: enrollment requires durable direct continuable lineage, including cold children', async () => {
  const ctx = { get(name) { if (name === 'subagents') return { async listChildren() { return [{ id: 'cold', mode: 'continuable' }, { id: 'once', mode: 'one-shot' }]; } }; } };
  const { tools } = harness([], {}, {}, ctx);
  await assert.rejects(tools.enroll.execute({ session_id: 'stranger', role_id: 'researcher' }, execution), /不属于/);
  await assert.rejects(tools.enroll.execute({ session_id: 'once', role_id: 'researcher' }, execution), /不属于/);
  const enrolled = JSON.parse(await tools.enroll.execute({ session_id: 'cold', role_id: 'researcher' }, execution)).enrolled;
  assert.equal(enrolled.verifiedParentId, 'p');
  assert.equal(enrolled.effectivePermission, 'unknown');
  assert.equal(enrolled.model, '');
});

test('F5: actual permission is distinct from role; readonly tasks cannot use writable execution', async () => {
  const adapter = { async listWorkers() { return { workers: [{ id: 'w', agentName: 'Writer', mode: 'accept-edits' }] }; } };
  const h = harness([], adapter);
  const enrolled = JSON.parse(await h.tools.enroll.execute({ worker_id: 'w', role_id: 'researcher' }, execution)).enrolled;
  assert.equal(enrolled.roleReadOnly, true);
  assert.equal(enrolled.readOnly, false);
  assert.equal(enrolled.effectivePermission, 'writable');
  await assert.rejects(createCouncilEngine({ adapter, config }).assign({ parentSessionId: 'p', members: [enrolled], assignments: [{ member: 'w', task: 'read' }], signal }), /可验证的只读/);
});

test('F5: overlapping normalized paths are rejected before any dispatch', async () => {
  const sent = [];
  const adapter = { async listWorkers() { return { workers: ['a', 'b'].map((id) => ({ id, mode: 'accept-edits' })) }; }, async followup(...args) { sent.push(args); } };
  const engine = createCouncilEngine({ adapter, config });
  const suffix = process.platform === 'win32' ? 'SRC\\app.js' : 'src/app.js';
  await assert.rejects(engine.assign({ parentSessionId: 'p', parentAgent: parent, members: [member('a'), member('b')], assignments: [{ member: 'a', task: 'x', write_scope: 'src/./' }, { member: 'b', task: 'y', write_scope: suffix }], signal }), /重叠/);
  assert.equal(sent.length, 0);
  assert.throws(() => canonicalScope('../escape'), /工作区/);
  assert.equal(scopesOverlap(canonicalScope('src'), canonicalScope('src2')), false);
});

test('F6: restart preserves recipients, pending messages and uncertain send; capacity never drops data', async () => {
  const records = [], projection = createCouncilProjection(config);
  let state = projection.init();
  const options = { maxEntries: 2, read: () => state.relay, write: (_id, data) => {
    const event = { type: 'plugin:council/relay', ignorable: true, data }; records.push(JSON.parse(JSON.stringify(event))); state = projection.apply(state, event);
  } };
  let log = createRelayLog(options);
  const first = await log.append('p', 'one', { recipients: ['a', 'b'] });
  await log.mark('p', 'a', [first], 'delivered', 'r1');
  await log.mark('p', 'b', [first], 'sending');
  await log.append('p', 'two', { recipients: ['b'] });
  await assert.rejects(log.append('p', 'three', { recipients: ['b'] }), /已满/);
  state = records.reduce((value, event) => projection.apply(value, event), projection.init());
  log = createRelayLog(options);
  assert.deepEqual(log.pending('p', 'a'), []);
  assert.deepEqual(log.pending('p', 'b').map((entry) => entry.text), ['two']);
  assert.deepEqual(log.uncertain('p', 'b').map((entry) => entry.text), ['one']);
  const adapter = new Recorder();
  await createCouncilEngine({ adapter, config, relayLog: log }).relay({ parentSessionId: 'p', members: [member('b')], signal });
  assert.equal(adapter.calls.length, 0);
  assert.deepEqual(log.pending('fork', 'b'), []);
  const engine = createCouncilEngine({ adapter, config, relayLog: log });
  await engine.resolveDelivery({ parentSessionId: 'p', memberId: 'b', seq: 1, resolution: 'received' });
  await engine.relay({ parentSessionId: 'p', members: [member('b')], signal });
  assert.equal(adapter.calls.length, 1);
  assert.match(adapter.calls[0].prompt, /two/);
  assert.doesNotMatch(adapter.calls[0].prompt, /one/);
});

test('F6: pending backlog is chunked within 12000 characters without marking unsent messages', async () => {
  const log = createRelayLog(), adapter = new Recorder();
  for (let i = 0; i < 3; i++) await log.append('p', String(i) + 'x'.repeat(7999), { recipients: ['a'] });
  const engine = createCouncilEngine({ adapter, config, relayLog: log });
  for (let i = 0; i < 3; i++) {
    await engine.relay({ parentSessionId: 'p', members: [member('a')], signal });
    assert.equal(log.pending('p', 'a').length, 2 - i);
  }
  assert.equal(adapter.calls.length, 3);
  assert(adapter.calls.every((call) => call.prompt.length <= 12000));
});

test('F7: history and rolling snapshots retain H, A and B', async () => {
  const states = [], effects = [];
  const React = { useState(initial) { const i = states.length; states.push(initial); return [initial, (value) => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; }, useRef(value) { return { current: value }; }, useEffect(fn) { effects.push(fn); } };
  const api = { cliworker: { watch() {}, async history() { return { ok: true, value: JSON.stringify({ items: [{ id: 'H' }], hasOlder: false }) }; } }, remote: { $stream() { return {
    async *[Symbol.asyncIterator]() { yield { value: JSON.stringify({ timeline: [{ id: 'A' }], truncated: true }), accept() {} }; await tick(); yield { value: JSON.stringify({ timeline: [{ id: 'B' }], truncated: true }), accept() {} }; }, async dispose() {},
  }; } } };
  const context = vm.createContext({ React, mergeTimelineItems, api, members: [member('w')] });
  vm.runInContext(fs.readFileSync(new URL('../client-src/state.js', import.meta.url), 'utf8'), context);
  vm.runInContext("useMemberStreams(api,'p',members,true)", context);
  const cleanup = effects[0](); await tick(); await tick();
  assert.deepEqual(Array.from(states[0].w.timeline, (row) => row.id), ['H', 'A', 'B']); cleanup();
});

test('F8: identical text from separate messages is kept; explicit id retry is idempotent', async () => {
  const log = createRelayLog();
  await log.append('p', '继续', { authorId: 'a', messageId: 'same', recipients: ['m'] });
  await log.append('p', '继续', { authorId: 'b', messageId: 'same', recipients: ['m'] });
  await log.append('p', '继续', { authorId: 'a', messageId: 'new', recipients: ['m'] });
  await log.append('p', '继续', { authorId: 'a', messageId: 'same', recipients: ['m'] });
  assert.equal(log.pending('p', 'm').length, 3);
  await assert.rejects(log.append('p', 'changed', { authorId: 'a', messageId: 'same', recipients: ['m'] }), /内容或收件人不同/);
});

test('F9: canonical enrollment survives projection and roster name is routable', async () => {
  const adapter = new Recorder(); adapter.listWorkers = async () => ({ workers: [{ id: 'w', agentName: 'Alpha', mode: 'plan' }] });
  const engine = createCouncilEngine({ adapter, config }), h = harness([], adapter, engine);
  const args = { worker_id: 'w', role_id: 'researcher' };
  h.fold({ type: 'tool/call', data: { name: 'council_enroll', callId: 'e', arguments: JSON.stringify(args) } });
  const result = await h.tools.enroll.execute(args, execution);
  h.fold({ type: 'tool/result', data: { message: { toolCallId: 'e', content: [{ type: 'text', text: result }] } } });
  assert.equal(h.state.members[0].name, 'Alpha');
  assert.equal(JSON.parse(await h.tools.roster.execute({}, execution)).members[0].name, 'Alpha');
  await h.tools.convene.execute({ members: 'Alpha', message: 'hello' }, execution);
  assert.equal(adapter.calls[0].id, 'w');
  assert.throws(() => resolveMember([member('a', { name: 'same' }), member('b', { name: 'same' })], 'same'), /歧义/);
  assert.equal(resolveMember([member('a', { name: 'same' }), member('b', { name: 'same' })], 'a').workerId, 'a');
});

test('F10: deadline bounds roster, admission, stream read and broken stream cleanup', async () => {
  const keepAlive = setInterval(() => {}, 10);
  try {
    for (const stage of ['roster', 'followup', 'stream']) {
      const worker = { id: 'a', mode: 'plan', runId: 'old', status: 'completed' }; let reads = 0;
      const never = () => new Promise(() => {});
      const adapter = {
        listWorkers: () => stage === 'roster' ? never() : Promise.resolve({ workers: [worker] }),
        followup: () => stage === 'followup' ? never() : Promise.resolve({ runId: 'r' }),
        watch: () => ({ [Symbol.asyncIterator]() { return this; }, next: () => reads++ === 0 ? Promise.resolve({ value: { selected: worker }, done: false }) : never(), return: never }),
      };
      const engine = createCouncilEngine({ adapter, config: { ...config, assignmentTimeoutMs: 20 } });
      const start = Date.now();
      await engine.assign({ parentSessionId: 'p', members: [member('a')], assignments: [{ member: 'a', task: 'read' }], signal }).catch((error) => assert.match(error.name, /Timeout|Abort/));
      assert(Date.now() - start < 300, stage);
    }
  } finally { clearInterval(keepAlive); }
});
