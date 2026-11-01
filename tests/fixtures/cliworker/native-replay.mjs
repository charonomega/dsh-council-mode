// Synthetic app-server frames only. No subprocess, CLI account, or model is used.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runNativeCodex } from '../../../vendor/dsh-cliworker-now/lib/native-codex.mjs';
import { createNativeIO } from '../../../vendor/dsh-cliworker-now/lib/native-transport.mjs';

const project = fileURLToPath(new URL('../../..', import.meta.url));
export const frame = (method, params) => ({ method, params: { threadId: 'fixture', turnId: 'turn', ...params } });
export const item = value => frame('item/completed', { item: value });
export const finish = (status = 'completed', items = [], error = null) =>
  frame('turn/completed', { turn: { id: 'turn', status, items, error } });
export const answer = { id: 'answer', type: 'agentMessage', text: 'FINAL: fixture completed.' };
export const failed = { id: 'tool-fail', type: 'commandExecution', command: 'fixture-only', status: 'failed', exitCode: 7, aggregatedOutput: 'Expected fixture failure' };
export const success = { ...failed, id: 'tool-ok', status: 'completed', exitCode: 0, aggregatedOutput: 'Recovered' };

export async function replay(frames, {
  resume = true, mode = 'accept-edits', prompt = 'Synthetic replay; never execute commands.',
  attachments = [], exitCode = 0, interrupt = false,
} = {}) {
  const config = { cli: 'codex', project, mode, prompt, attachments,
    ...(resume ? { conversationId: 'fixture' } : {}),
    preference: { model: 'fixture-model', effort: 'low' }, timeoutMs: 1000,
    maxRunBytes: 67108864, maxLineBytes: 1048576 };
  config.argv = ['codex', 'exec', ...(resume ? ['resume', 'fixture'] : []), '--json', `任务：\n${prompt}`];
  let listener, resolveDone, rejectDone, fault, result, bytes = 0;
  const observed = [], native = [], requests = [], replies = [];
  const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  done.catch(() => {});
  const io = createNativeIO(config, line => {
    bytes += Buffer.byteLength(line);
    const record = JSON.parse(line);
    if (record.type === 'result') result = record;
    if (record.type === 'event') observed.push(record.event);
    if (record.type === 'native') native.push(record.record);
  });
  const peer = {
    onMessage(fn) { listener = fn; return () => {}; }, send(value) { replies.push(value); },
    end() {}, close() {}, done: Promise.resolve({ exitCode }), waitFor() { return done; },
    async request(method, params) {
      requests.push({ method, params });
      if (method === 'initialize') return {};
      if (method === 'thread/resume' || method === 'thread/start') return {
        thread: { id: 'fixture' }, model: config.preference.model, cwd: project,
        approvalPolicy: 'never', sandbox: { type: mode === 'plan' ? 'readOnly' : 'workspaceWrite', networkAccess: false },
      };
      assert.equal(method, 'turn/start');
      setImmediate(() => {
        try {
          for (const value of frames) listener(value);
          if (interrupt) throw new Error('Fixture transport interrupted before completion');
          resolveDone();
        } catch (error) { rejectDone(error); }
      });
      return { turn: { id: 'turn' } };
    },
  };
  // Replacing openStdio prevents every native child-process launch.
  io.openStdio = () => peer;
  try { await runNativeCodex(config, io); } catch (error) { fault = error; }
  await io.close(fault);
  return { result, observed, native, requests, replies, bytes };
}
