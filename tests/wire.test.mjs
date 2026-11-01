import assert from 'node:assert/strict';
import test from 'node:test';
import { createCouncilProjection } from '../lib/projection.js';
import { resolveConfig } from '../lib/config.js';

function replay(records) {
  const projection = createCouncilProjection(resolveConfig({}));
  const state = records.reduce((state, record) => projection.apply(state, record), projection.init());
  return { projection, state, view: projection.wire.view(state) };
}

function enrolled(args, canonical) {
  return [
    { type: 'tool/call', time: 100, data: { name: 'council_enroll', callId: 'enroll', arguments: JSON.stringify(args) } },
    { type: 'tool/result', time: 200, data: { message: { toolCallId: 'enroll', content: [{ type: 'text', text: canonical ? JSON.stringify({ enrolled: canonical }) : 'Member enrolled' }] } } },
  ];
}

function assertLosslessWire(view) {
  // Exercise the shape carried by api-session/added: JSON must not silently
  // drop fields or change values while crossing the host/client boundary.
  const summary = { sessionId: 'parent', projections: { values: { council: view } } };
  assert.deepEqual(JSON.parse(JSON.stringify(summary)), summary);
}

test('cold CLI enrollment emits no undefined child identities', () => {
  const { view } = replay(enrolled({ worker_id: 'cli', role_id: 'engineer' }, {
    workerId: 'cli', roleId: 'engineer', kind: 'cliworker', name: 'Codex',
    effectivePermission: 'read-only', verifiedParentId: 'parent',
  }));
  assertLosslessWire(view);
  assert.equal(view.members[0].workerId, 'cli');
  assert.equal(view.members[0].verifiedParentId, 'parent');
  assert.equal(Object.hasOwn(view.members[0], 'agentId'), false);
  assert.equal(Object.hasOwn(view.members[0], 'sessionId'), false);
});

test('legacy CLI and native enrollments resume without inventing verification', () => {
  for (const args of [{ worker_id: 'cli', role_id: 'reviewer' }, { session_id: 'child', role_id: 'researcher' }]) {
    const { view } = replay(enrolled(args));
    assertLosslessWire(view);
    assert.equal(Object.hasOwn(view.members[0], 'verifiedParentId'), false);
    assert.equal(view.members[0].effectivePermission, 'unknown');
  }
});

test('verified native identity and permission survive the transport boundary', () => {
  const { view } = replay(enrolled({ session_id: 'child', role_id: 'researcher' }, {
    workerId: 'child', roleId: 'researcher', kind: 'subagent', agentId: 'child', sessionId: 'child',
    effectivePermission: 'read-only', verifiedParentId: 'parent',
  }));
  assertLosslessWire(view);
  assert.equal(view.members[0].sessionId, 'child');
  assert.equal(view.members[0].agentId, 'child');
  assert.equal(view.members[0].readOnly, true);
});

test('in-progress assignments omit unavailable run/error fields during resume', () => {
  const { view } = replay([{ type: 'tool/call', time: 300, data: {
    name: 'council_assign', callId: 'assign', arguments: JSON.stringify({ assignments: [{ member: 'cli', task: 'Read the source' }] }),
  } }]);
  assertLosslessWire(view);
  assert.equal(view.assignments[0].status, 'running');
  assert.equal(Object.hasOwn(view.assignments[0], 'error'), false);
  assert.equal(Object.hasOwn(view.assignments[0], 'runId'), false);
});

test('serialized historical state restores to a lossless stable wire view without mutation', () => {
  const old = replay(enrolled({ worker_id: 'cli', role_id: 'engineer' }));
  const state = JSON.parse(JSON.stringify(old.state));
  delete state.members[0].roleReadOnly;
  delete state.members[0].effectivePermission;
  const before = structuredClone(state);
  const projection = createCouncilProjection(resolveConfig({}));
  const view = projection.wire.view(projection.stateSchema.parse(state));
  assertLosslessWire(view);
  assert.equal(projection.wire.view(state), view);
  assert.deepEqual(state, before);
  assert.equal(Object.hasOwn(view.members[0], 'rolePrompt'), false);
});
