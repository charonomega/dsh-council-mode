import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { currentMemberWorker, mergeRoom, mergeTimelineItems } from '../lib/client-room.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/cliworker-growing-rows.json', import.meta.url)));
const stateSource = fs.readFileSync(new URL('../client-src/state.js', import.meta.url), 'utf8');
const member = { workerId: 'fixture-worker', name: 'Codex', roleName: '工程师' };
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Exercise the production hook with one mounted effect and a controlled stream.
function mountStream(stream, history) {
  const states = [], effects = [];
  const React = {
    useState(initial) {
      const i = states.length;
      states.push(initial);
      return [initial, (value) => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
    useRef(value) { return { current: value }; },
    useEffect(fn) { effects.push(fn); },
  };
  const api = { cliworker: { watch() {}, history }, remote: { $stream() { return stream; } } };
  const context = vm.createContext({ React, mergeTimelineItems, api, members: [member] });
  vm.runInContext(stateSource, context);
  vm.runInContext("useMemberStreams(api, 'parent', members, true)", context);
  const cleanup = effects[0]();
  return { snapshot: () => states[0][member.workerId], cleanup };
}

function room(snapshot, roster) {
  return mergeRoom({ members: [member], timelines: { [member.workerId]: snapshot }, roster });
}
const messages = (items) => items.filter((item) => item.type === 'message');

test('mutable timeline rows replace text and remove stale metadata without moving the row', () => {
  const original = { id: 'a', text: 'partial', streaming: true };
  const final = { id: 'a', text: 'complete' };
  const merged = mergeTimelineItems([original, { id: 'b' }], [final, { id: 'c' }]);
  assert.deepEqual(merged.map((row) => row.id), ['a', 'b', 'c']);
  assert.equal(merged[0], final);
  assert.equal(merged[0].streaming, undefined);
  assert.equal(original.text, 'partial');
});

test('saved CLI Worker snapshots finish both bubbles through one continuously mounted member hook', { timeout: 3000 }, async () => {
  let finish, accepted = 0, opens = 0;
  const done = new Promise((resolve) => { finish = resolve; });
  const observed = [];
  const stream = {
    async *[Symbol.asyncIterator]() {
      opens++;
      for (const snapshot of fixture.snapshots) {
        yield { value: JSON.stringify(snapshot), accept() {
          accepted++;
          const current = hook.snapshot();
          observed.push(messages(room(current, { revision: 0, workers: [{ ...current.selected, status: 'running' }] })));
        } };
      }
      finish();
    },
    async dispose() {},
  };
  const hook = mountStream(stream);
  try {
    await done;
    assert.equal(opens, 1);
    assert.equal(accepted, fixture.snapshots.length);
    assert.deepEqual(observed.at(-1).map((row) => row.text.length), [383, 383]);
    assert(observed.at(-1).every((row) => row.streaming === false));
    for (const snapshot of fixture.snapshots) {
      const expected = messages(room(snapshot, { revision: 0, workers: [] }));
      const actual = observed[fixture.snapshots.indexOf(snapshot)];
      assert.deepEqual(actual.map((row) => [row.runId, row.text, row.streaming]), expected.map((row) => [row.runId, row.text, row.streaming]));
    }
    assert(observed.some((rows) => rows.some((row) => row.streaming && row.text.length < 383)));
  } finally { hook.cleanup(); }
});

test('late history cannot roll back a growing live row or lose it on the next rolling snapshot', { timeout: 3000 }, async () => {
  let resolveHistory, finish;
  const historyResponse = new Promise((resolve) => { resolveHistory = resolve; });
  const done = new Promise((resolve) => { finish = resolve; });
  const stream = {
    async *[Symbol.asyncIterator]() {
      yield { value: JSON.stringify({ timeline: [{ id: 'a', text: 'partial' }], truncated: true }), accept() {} };
      yield { value: JSON.stringify({ timeline: [{ id: 'a', text: 'complete' }], truncated: true }), accept() {} };
      resolveHistory({ ok: true, value: JSON.stringify({ items: [{ id: 'older' }, { id: 'a', text: 'partial' }], hasOlder: false }) });
      await tick();
      yield { value: JSON.stringify({ timeline: [{ id: 'b', text: 'new run' }], truncated: true }), accept() {} };
      finish();
    },
    async dispose() {},
  };
  const hook = mountStream(stream, () => historyResponse);
  try {
    await done;
    assert.deepEqual(Array.from(hook.snapshot().timeline, (row) => [row.id, row.text]), [['older', undefined], ['a', 'complete'], ['b', 'new run']]);
  } finally { hook.cleanup(); }
});

test('member completion overrides a stale running roster in the rendered room', () => {
  const snapshot = fixture.snapshots.at(-1);
  const roster = { revision: snapshot.revision - 1, workers: [{ ...snapshot.selected, status: 'running' }] };
  const rendered = room(snapshot, roster);
  assert(messages(rendered).every((row) => row.streaming === false));
  assert(!rendered.some((row) => row.type === 'typing'));
});

test('newer roster starts only the current run; completed older bubbles stay finished', () => {
  const snapshot = fixture.snapshots.at(-2);
  const running = { ...snapshot.selected, status: 'running' };
  const rendered = room({ ...snapshot, selected: { ...running, status: 'completed' } }, { revision: snapshot.revision + 1, workers: [running] });
  const rows = messages(rendered);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].streaming, false);
  assert.equal(rows[1].streaming, true);
  const next = { ...running, runId: 'next-run' };
  const waiting = room(snapshot, { revision: snapshot.revision + 1, workers: [next] });
  assert(messages(waiting).every((row) => row.streaming === false));
  assert.deepEqual(waiting.find((row) => row.type === 'typing').names, ['Codex']);
});

test('equal or absent revisions prefer the worker carried with the member timeline', () => {
  const selected = { id: member.workerId, status: 'completed' };
  for (const revision of [undefined, 42]) {
    assert.equal(currentMemberWorker(member, { revision, workers: [{ ...selected, status: 'running' }] }, { revision, selected }), selected);
  }
});

test('a snapshot for another worker cannot replace this member status', () => {
  const listed = { id: member.workerId, status: 'completed' };
  assert.equal(currentMemberWorker(member, { revision: 1, workers: [listed] }, { revision: 2, selected: { id: 'other', status: 'running' } }), listed);
});
