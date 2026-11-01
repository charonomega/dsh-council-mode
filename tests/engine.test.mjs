import assert from 'node:assert/strict';
import test from 'node:test';
import { createCouncilEngine } from '../lib/engine.js';
import { ROLE_BY_ID } from '../lib/catalog.js';

class FakeCliWorker {
  constructor() {
    this.workers = new Map();
    this.runs = 0;
    this.stopped = [];
  }

  add(id, options = {}) {
    const worker = {
      id,
      parentSessionId: 'p1',
      agentName: id,
      preference: { cli: options.cli ?? 'codex', model: 'test-model', effort: 'low' },
      mode: options.mode ?? 'accept-edits',
      status: 'completed',
      runId: 'run-0',
      timeline: [],
      delay: options.delay ?? 5,
      fail: options.fail ?? false,
      subscribers: new Set(),
    };
    this.workers.set(id, worker);
    return worker;
  }

  snapshot(worker) {
    return JSON.stringify({
      workers: [...this.workers.values()].map((item) => ({ ...item, subscribers: undefined })),
      selected: { ...worker, subscribers: undefined, timeline: worker.timeline.slice() },
      timeline: worker.timeline.slice(),
      revision: ++this.runs,
      truncated: false,
    });
  }

  emit(worker) {
    const snapshot = this.snapshot(worker);
    for (const subscriber of worker.subscribers) subscriber(snapshot);
  }

  watch(_parent, workerId, signal) {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`missing worker ${workerId}`);
    const queue = [];
    const waiters = [];
    const push = (snapshot) => {
      const waiter = waiters.shift();
      if (waiter) waiter(snapshot);
      else queue.push(snapshot);
    };
    worker.subscribers.add(push);
    const self = this;
    return (async function* () {
      try {
        yield self.snapshot(worker);
        while (!signal?.aborted) {
          const next =
            queue.shift() ??
            (await new Promise((resolve, reject) => {
              waiters.push(resolve);
              signal?.addEventListener(
                'abort',
                () => reject(signal.reason ?? new Error('aborted')),
                { once: true },
              );
            }));
          yield next;
        }
      } finally {
        worker.subscribers.delete(push);
      }
    })();
  }

  async followup(_parent, workerId, prompt, _signal) {
    const worker = this.workers.get(workerId);
    const runId = `run-${++this.runs}`;
    worker.runId = runId;
    worker.status = 'running';
    worker.timeline.push({ kind: 'user', text: prompt, runId, time: new Date().toISOString() });
    this.emit(worker);
    setTimeout(() => {
      if (worker.fail) {
        worker.status = 'failed';
        worker.error = 'mock failure';
      } else {
        worker.timeline.push({ kind: 'assistant', text: `draft ${runId}`, runId });
        worker.timeline.push({ kind: 'result', text: `reply from ${workerId}`, runId });
        worker.status = 'completed';
      }
      this.emit(worker);
    }, worker.delay);
    return JSON.stringify({ workerId, runId });
  }

  async stop(_parent, workerId) {
    this.stopped.push(workerId);
    const worker = this.workers.get(workerId);
    worker.status = 'interrupted';
    return JSON.stringify({ workerId, status: 'interrupted' });
  }

  async listWorkers() {
    return { workers: [...this.workers.values()], archivedWorkers: [] };
  }

  async cliSettings() {
    return { enabled: { codex: true } };
  }
}

function member(id, roleId = 'reviewer', overrides = {}) {
  const role = ROLE_BY_ID[roleId];
  return {
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

const config = {
  maxMembers: 6,
  maxRounds: 2,
  statementLimit: 1000,
  roundTimeoutMs: 200,
  assignmentTimeoutMs: 200,
  maxDigestChars: 8000,
};

test('convene gathers replies and returns a digest', async () => {
  const fake = new FakeCliWorker();
  fake.add('codex');
  const engine = createCouncilEngine({ adapter: fake, config });
  const digest = await engine.convene({
    parentSessionId: 'p1',
    members: [member('codex')],
    topic: '要不要重构',
    rounds: 1,
    focus: '',
    signal: new AbortController().signal,
  });
  assert.match(digest, /reply from codex/);
  assert.match(digest, /议会转达完成/);
  assert.equal(fake.workers.get('codex').status, 'completed');
});

test('relay sends native subagent members through the DSH subagent seam', async () => {
  const fake = new FakeCliWorker();
  const sent = [];
  const engine = createCouncilEngine({
    adapter: fake,
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
      {
        kind: 'subagent',
        sessionId: 'child-1',
        workerId: 'child-1',
        name: 'deepseek-1',
        roleId: 'researcher',
        roleName: '研究员',
        readOnly: true,
      },
    ],
    message: '按时间顺序的记录',
    signal: new AbortController().signal,
  });
  assert.match(result, /1\/1/);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].sender, parentAgent);
  assert.equal(sent[0].targetId, 'child-1');
  assert.match(sent[0].text, /按时间顺序的记录/);
});

test('convene rejects an empty roster', async () => {
  const fake = new FakeCliWorker();
  const engine = createCouncilEngine({ adapter: fake, config });
  await assert.rejects(
    engine.convene({
      parentSessionId: 'p1',
      members: [],
      topic: 'x',
      rounds: 1,
      signal: new AbortController().signal,
    }),
    /还没有成员/,
  );
});

test('convene records a missing worker instead of throwing', async () => {
  const fake = new FakeCliWorker();
  const engine = createCouncilEngine({ adapter: fake, config });
  const digest = await engine.convene({
    parentSessionId: 'p1',
    members: [member('ghost')],
    topic: 'x',
    rounds: 1,
    signal: new AbortController().signal,
  });
  assert.match(digest, /未完成/);
  assert.match(digest, /CLI Worker/);
});

test('convene times out without killing the worker', async () => {
  const fake = new FakeCliWorker();
  fake.add('codex', { delay: 500 });
  const engine = createCouncilEngine({ adapter: fake, config: { ...config, roundTimeoutMs: 30 } });
  const digest = await engine.convene({
    parentSessionId: 'p1',
    members: [member('codex')],
    topic: 'x',
    rounds: 1,
    signal: new AbortController().signal,
  });
  assert.match(digest, /超时/);
  assert.deepEqual(fake.stopped, []);
});

test('aborting never stops an unfenced worker id', async () => {
  const fake = new FakeCliWorker();
  fake.add('codex', { delay: 500 });
  const engine = createCouncilEngine({ adapter: fake, config });
  const controller = new AbortController();
  const running = engine.convene({
    parentSessionId: 'p1',
    members: [member('codex')],
    topic: 'x',
    rounds: 1,
    signal: controller.signal,
  });
  await new Promise((resolve) => setTimeout(resolve, 40));
  controller.abort(new Error('user stop'));
  await assert.rejects(running);
  assert.deepEqual(fake.stopped, []);
});

test('assign rejects a read-only member with a write scope', async () => {
  const fake = new FakeCliWorker();
  fake.add('codex', { mode: 'plan' });
  const engine = createCouncilEngine({ adapter: fake, config });
  await assert.rejects(
    engine.assign({
      parentSessionId: 'p1',
      members: [member('codex')],
      assignments: [{ member: 'codex', task: '改代码', write_scope: 'src/' }],
      signal: new AbortController().signal,
    }),
    /只读成员/,
  );
});

test('assign rejects duplicate write scopes', async () => {
  const fake = new FakeCliWorker();
  fake.add('a');
  fake.add('b');
  const engine = createCouncilEngine({ adapter: fake, config });
  await assert.rejects(
    engine.assign({
      parentSessionId: 'p1',
      members: [member('a', 'engineer'), member('b', 'engineer')],
      assignments: [
        { member: 'a', task: 'x', write_scope: 'src/' },
        { member: 'b', task: 'y', write_scope: 'src/' },
      ],
      signal: new AbortController().signal,
    }),
    /写入范围重复/,
  );
});

test('assign returns per-member results', async () => {
  const fake = new FakeCliWorker();
  fake.add('a');
  const engine = createCouncilEngine({ adapter: fake, config });
  const report = await engine.assign({
    parentSessionId: 'p1',
    members: [member('a', 'engineer')],
    assignments: [{ member: 'a', task: '修 bug', write_scope: 'src/', reason: '工程角色' }],
    signal: new AbortController().signal,
  });
  assert.match(report, /完成/);
  assert.match(report, /reply from a/);
});
