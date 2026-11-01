import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COUNCIL_PROJECTION_KEY,
  COUNCIL_STATE_VERSION,
  createCouncilProjection,
  emptyCouncilState,
} from '../lib/projection.js';
import { resolveConfig } from '../lib/config.js';

function event(type, data, time = 1000) {
  return { type, data, seq: 1, time };
}

const config = resolveConfig({});
const projection = createCouncilProjection(config);

function fold(events) {
  let state = projection.init();
  for (const item of events) state = projection.apply(state, item);
  return state;
}

test('projection identity is stable for unrelated events', () => {
  const state = emptyCouncilState();
  assert.equal(projection.apply(state, event('turn/start', { turn: 1 })), state);
  assert.equal(COUNCIL_PROJECTION_KEY, 'council');
  assert.equal(COUNCIL_STATE_VERSION, 3);
});

test('/council on commits only after a successful command', () => {
  let state = fold([event('command/run', { commandId: 'c1', name: 'council', args: 'on' })]);
  assert.equal(state.active, false);
  assert.deepEqual(state.pendingCommand, { commandId: 'c1', active: true });
  state = projection.apply(state, event('command/done', { commandId: 'c1', kind: 'success' }));
  assert.equal(state.active, true);
  assert.equal(state.pendingCommand, null);
});

test('/council off and failed commands', () => {
  let state = fold([
    event('command/run', { commandId: 'c1', name: 'council', args: 'on' }),
    event('command/done', { commandId: 'c1', kind: 'success' }),
  ]);
  state = projection.apply(state, event('command/run', { commandId: 'c2', name: 'council', args: 'off' }));
  assert.equal(state.active, true);
  state = projection.apply(state, event('command/done', { commandId: 'c2', kind: 'error' }));
  assert.equal(state.active, true);
  assert.equal(state.pendingCommand, null);
  state = projection.apply(state, event('command/run', { commandId: 'c3', name: 'council', args: 'off' }));
  state = projection.apply(state, event('command/done', { commandId: 'c3', kind: 'success' }));
  assert.equal(state.active, false);
});

test('enroll commits only on a successful tool result', () => {
  const call = event('tool/call', {
    turn: 1,
    step: 1,
    callId: 'call-1',
    name: 'council_enroll',
    arguments: JSON.stringify({ worker_id: 'w1', role_id: 'reviewer', display_name: 'Codex 审查员' }),
  });
  let state = fold([
    event('command/run', { commandId: 'c1', name: 'council', args: 'on' }),
    event('command/done', { commandId: 'c1', kind: 'success' }),
    call,
  ]);
  assert.equal(state.members.length, 0);
  assert.equal(state.pendingEnroll.workerId, 'w1');
  state = projection.apply(
    state,
    event('tool/result', {
      turn: 1,
      step: 1,
      message: { toolCallId: 'call-1', isError: false, content: [] },
    }, 2000),
  );
  assert.equal(state.members.length, 1);
  assert.equal(state.members[0].name, 'Codex 审查员');
  assert.equal(state.members[0].roleName, '代码审查员');
  assert.equal(state.members[0].readOnly, false);
  assert.equal(state.members[0].roleReadOnly, true);
  assert.equal(state.members[0].effectivePermission, 'unknown');
  assert.equal(state.pendingEnroll, null);
});

test('native subagent enroll commits kind and child session fields', () => {
  let state = fold([
    event('tool/call', {
      callId: 'native-1',
      name: 'council_enroll',
      arguments: JSON.stringify({
        agent_id: 'child-1',
        role_id: 'researcher',
        display_name: 'deepseek-1',
      }),
    }),
  ]);
  assert.equal(state.pendingEnroll.kind, 'subagent');
  assert.equal(state.pendingEnroll.sessionId, '');
  state = projection.apply(
    state,
    event('tool/result', {
      message: { toolCallId: 'native-1', isError: false, content: [] },
    }, 2000),
  );
  assert.equal(state.members.length, 1);
  assert.equal(state.members[0].kind, 'subagent');
  assert.equal(state.members[0].workerId, 'child-1');
  assert.equal(state.members[0].agentId, 'child-1');
  assert.equal(state.members[0].cli, 'deepseek');
  assert.equal(state.members[0].name, 'deepseek-1');
  const view = projection.wire.view(state);
  assert.equal(view.members[0].kind, 'subagent');
  assert.equal(view.members[0].workerId, 'child-1');
});

test('failed enroll leaves no member', () => {
  let state = fold([
    event('tool/call', {
      callId: 'call-2',
      name: 'council_enroll',
      arguments: JSON.stringify({ worker_id: 'w1', role_id: 'engineer' }),
    }),
  ]);
  state = projection.apply(
    state,
    event('tool/result', {
      message: { toolCallId: 'call-2', isError: true, content: [] },
      error: { code: 'x', reason: 'worker missing' },
    }),
  );
  assert.equal(state.members.length, 0);
  assert.equal(state.pendingEnroll, null);
  assert.equal(state.lastError, 'worker missing');
});

test('convene and assign phase transitions', () => {
  let state = fold([
    event('tool/call', {
      callId: 'conv-1',
      name: 'council_convene',
      arguments: JSON.stringify({ message: '选哪个方案' }),
    }),
  ]);
  assert.equal(state.phase, 'discussion');
  assert.equal(state.topic, '选哪个方案');
  assert.equal(state.rounds, 2);
  state = projection.apply(
    state,
    event('tool/result', { message: { toolCallId: 'conv-1', isError: false, content: [] } }),
  );
  assert.equal(state.phase, 'idle');
  state = projection.apply(state, event('assistant/message', { turn: 1, step: 1, message: {}, stream: [] }));
  assert.equal(state.phase, 'idle');
  state = projection.apply(
    state,
    event('tool/call', {
      callId: 'assign-1',
      name: 'council_assign',
      arguments: JSON.stringify({
        assignments: [{ member: 'codex-reviewer', task: '审查登录', write_scope: '', reason: '擅长代码审查' }],
      }),
    }),
  );
  assert.equal(state.phase, 'execution');
  assert.equal(state.assignments.length, 1);
  assert.equal(state.assignments[0].status, 'running');
  state = projection.apply(
    state,
    event('tool/result', { message: { toolCallId: 'assign-1', isError: false, content: [] } }),
  );
  assert.equal(state.phase, 'idle');
  assert.equal(state.assignments[0].status, 'uncertain');
});

test('topic stays on the first message and resets for a new activation', () => {
  let state = fold([
    event('command/run', { commandId: 'c1', name: 'council', args: 'on' }),
    event('command/done', { commandId: 'c1', kind: 'success' }),
    event('tool/call', {
      callId: 'conv-a',
      name: 'council_convene',
      arguments: JSON.stringify({ message: '第一个议题' }),
    }),
    event('tool/call', {
      callId: 'conv-b',
      name: 'council_convene',
      arguments: JSON.stringify({ message: '一条成员回复' }),
    }),
  ]);
  assert.equal(state.topic, '第一个议题');
  state = projection.apply(state, event('command/run', { commandId: 'c2', name: 'council', args: 'off' }));
  state = projection.apply(state, event('command/done', { commandId: 'c2', kind: 'success' }));
  assert.equal(state.active, false);
  state = projection.apply(state, event('command/run', { commandId: 'c3', name: 'council', args: 'on' }));
  state = projection.apply(state, event('command/done', { commandId: 'c3', kind: 'success' }));
  assert.equal(state.topic, '');
});

test('legacy topic arguments still project the topic', () => {
  const state = fold([
    event('tool/call', {
      callId: 'legacy-1',
      name: 'council_convene',
      arguments: JSON.stringify({ topic: '旧格式议题' }),
    }),
  ]);
  assert.equal(state.topic, '旧格式议题');
});

test('failed convene resets phase and records the error', () => {
  let state = fold([
    event('tool/call', {
      callId: 'conv-2',
      name: 'council_convene',
      arguments: JSON.stringify({ message: 'x' }),
    }),
  ]);
  state = projection.apply(
    state,
    event('tool/result', {
      message: { toolCallId: 'conv-2', isError: true, content: [] },
      error: { code: 'no-members', reason: '没有成员' },
    }),
  );
  assert.equal(state.phase, 'idle');
  assert.equal(state.lastError, '没有成员');
});

test('view excludes role prompts and is reference-stable', () => {
  let state = fold([
    event('command/run', { commandId: 'c1', name: 'council', args: 'on' }),
    event('command/done', { commandId: 'c1', kind: 'success' }),
    event('tool/call', {
      callId: 'e1',
      name: 'council_enroll',
      arguments: JSON.stringify({ worker_id: 'w1', role_id: 'engineer' }),
    }),
    event('tool/result', { message: { toolCallId: 'e1', isError: false, content: [] } }),
  ]);
  const first = projection.wire.view(state);
  const second = projection.wire.view(state);
  assert.equal(first, second);
  assert.equal(first.members.length, 1);
  assert.equal('rolePrompt' in first.members[0], false);
  assert.equal(first.active, true);
  projection.wire.viewSchema.parse(first);
  projection.stateSchema.parse(state);
});
