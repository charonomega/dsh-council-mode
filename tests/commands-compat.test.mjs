import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

// Load the production entry and command registration. Only the two imports
// supplied by DSH are replaced so the test owns its in-memory session log.
const hostModules = new Map([
  ['@deepseek-ai/dsh-session', 'export const appendPluginRecord = (session, type, data) => session.append(type, data);'],
  ['@deepseek-ai/dsh-subagent', 'export const foldSubagentDescriptor = () => undefined; export const applyChildComposition = async () => {};'],
]);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (hostModules.has(specifier)) {
      return { url: 'data:text/javascript,' + encodeURIComponent(hostModules.get(specifier)), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { apply } = await import('../index.js');
hooks.deregister();

function mount(t, { cli, plan = false, readOnly = false, origin = 'user', archived = false } = {}) {
  const disposers = [];
  let command, projection;
  let state = {
    active: true,
    phase: 'discussion',
    members: [{ workerId: 'a', name: 'A' }, { workerId: 'b', name: 'B' }],
    roomHistory: [],
    room: {
      id: 'room', owner: 'previous-host', epoch: 'epoch', parentId: 'parent', protocol: 2,
      status: 'running', reason: '', topic: 'test topic', startedAt: 0,
      deadlineAt: Date.now() + 60_000, members: [{ workerId: 'a' }, { workerId: 'b' }],
      messages: [], deliveries: [], limits: { maxMessages: 24, maxTurnsPerMember: 6 },
    },
  };
  const records = [];
  const agent = {
    id: 'parent', status: 'running',
    session: {
      header: { origin },
      async append(type, data) {
        records.push({ type, data });
        state = projection.apply(state, { type, data, ignorable: true });
      },
    },
    ctx: { get(name) {
      if (name === 'planMode') return { get: () => ({ active: plan }) };
      if (name === 'sandboxPolicy') return { resolve: () => ({ mode: readOnly ? 'read-only' : 'workspace-write' }) };
    } },
  };
  const services = { cliworker: cli, agents: new Map([[agent.id, agent]]), sessions: { async flush() {} },
    workspaceRegistry: { archivedSessionIds: archived ? [agent.id] : [] } };
  const ctx = {
    get: (name) => services[name],
    sessionProjections: { register(value) { projection = value; }, stateOf: () => state },
    systemPrompt: { section: () => () => {} },
    tools: { register: () => () => {}, guard: () => () => {} },
    commands: { register(value) { command = value; return () => {}; } },
    logger: { warn(message) { throw new Error(message); } },
    effect(callback) {
      const dispose = callback();
      if (typeof dispose === 'function') disposers.push(dispose);
    },
    inject(names, callback) {
      if (names.length === 1 && names[0] === 'commands') callback(ctx);
    },
  };
  apply(ctx);
  t.after(async () => {
    for (const dispose of disposers.reverse()) await dispose();
  });
  assert.equal(command.name, 'council');
  return { records, state: () => state, run: (rawInput) => command.handler({ agent, rawInput }) };
}

const compatibleCli = () => ({
  watch() {}, followup() {}, submitMessage() {}, runtime: { get() {} }, harnessConversation: { lookup() {} },
});

test('owner pause, stop and room status work while CLI Worker is absent or incompatible', async (t) => {
  for (const cli of [undefined, { watch() {} }]) {
    for (const action of ['pause', 'stop', 'room-status']) {
      const fixture = mount(t, { cli });
      const result = await fixture.run(action);
      assert.equal(result.kind, 'success', action);
      assert.equal(JSON.parse(result.text).status, action === 'stop' ? 'stopped' : 'paused');
      assert.equal(fixture.records.length, 1);
    }
  }
});

test('owner can pause, stop and inspect after switching to plan or read-only', async (t) => {
  for (const mode of [{ plan: true }, { readOnly: true }]) {
    for (const action of ['pause', 'stop', 'room-status']) {
      const fixture = mount(t, { ...mode, cli: compatibleCli() });
      assert.equal((await fixture.run(action)).kind, 'success', action);
    }
  }
});

test('subagents cannot use passive controls on the parent room', async (t) => {
  for (const action of ['pause', 'stop', 'room-status']) {
    const fixture = mount(t, { origin: 'subagent', cli: compatibleCli() });
    const result = await fixture.run(action);
    assert.equal(result.kind, 'error');
    assert.match(result.text, /仅用于主对话/);
    assert.equal(fixture.records.length, 0);
  }
});

test('dispatch commands still require compatible CLI and writable execution mode', async (t) => {
  for (const options of [
    {}, { cli: { watch() {} } },
    { cli: compatibleCli(), plan: true }, { cli: compatibleCli(), readOnly: true },
  ]) {
    for (const action of ['start topic', 'say follow-up', 'resume']) {
      const fixture = mount(t, options);
      const result = await fixture.run(action);
      assert.equal(result.kind, 'error', action);
      assert.match(result.text, /CLI Worker|计划模式|只读/);
      assert.equal(fixture.records.length, 0);
    }
  }
});

test('budget changes and receipt reconciliation retain their dispatch permission gate', async (t) => {
  for (const mode of [{ plan: true }, { readOnly: true }]) {
    for (const action of ['unlimited on', 'room-resolve delivery retry']) {
      const fixture = mount(t, { ...mode, cli: compatibleCli() });
      const result = await fixture.run(action);
      assert.equal(result.kind, 'error');
      assert.match(result.text, /计划模式|只读/);
      assert.equal(fixture.records.length, 0);
    }
  }
});

test('archived owners retain passive controls while dispatch commands explain the archive boundary', async (t) => {
  for (const action of ['pause', 'stop', 'room-status']) {
    const fixture = mount(t, { archived: true, cli: compatibleCli() });
    assert.equal((await fixture.run(action)).kind, 'success', action);
  }
  for (const action of ['start topic', 'say follow-up', 'resume']) {
    const fixture = mount(t, { archived: true, cli: compatibleCli() });
    const result = await fixture.run(action);
    assert.equal(result.kind, 'error', action);
    assert.match(result.text, /主会话已归档/);
    assert.equal(fixture.records.length, 0);
  }
});
