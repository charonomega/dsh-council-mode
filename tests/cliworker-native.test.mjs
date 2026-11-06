import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { replay, frame, item, finish, answer, failed, success } from './fixtures/cliworker/native-replay.mjs';
import { cutBytes, createEventBudget, createNativeIO } from '../vendor/dsh-cliworker-now/lib/native-transport.mjs';

test('CLI Worker: UTF-8 preview prefixes stay within their budget', () => {
  for (const text of ['small\n', '汉字😀'.repeat(2000)]) {
    const output = cutBytes(text, 4096);
    assert(Buffer.byteLength(output) <= 4096);
    assert(!output.includes('\ufffd'));
    if (Buffer.byteLength(text) <= 4096) assert.equal(output, text);
    else assert(text.startsWith(output));
  }
});

test('CLI Worker: exhausted display budgets preserve final replies and emit one notice', () => {
  const notices = [];
  const budget = createEventBudget({ maxRunBytes: 8, maxLineBytes: 1024, maxToolPreviewBytes: 8 }, event => notices.push(event));
  const first = budget({ kind: 'tool', step: 1, delta: 'abcdefgh', state: 'RUNNING' });
  assert.equal(first.delta, 'abcdefgh');
  assert.equal(budget({ kind: 'tool', step: 2, delta: 'next', state: 'RUNNING' }).truncated, true);
  assert.equal(budget({ kind: 'tool', step: 3, delta: 'later', state: 'RUNNING' }), undefined);
  assert.equal(notices.length, 1);
  assert.equal(budget({ kind: 'assistant', text: 'complete answer', state: 'COMPLETED' }).text, 'complete answer');
});

test('CLI Worker: 10,000 native deltas retain full results without cumulative-output amplification', async () => {
  const delta = 'x'.repeat(16), full = delta.repeat(10000), summary = '公开摘要'.repeat(1000);
  function* frames() {
    yield frame('turn/started', { turn: { id: 'turn' } });
    yield frame('item/started', { item: { ...success, status: 'inProgress' } });
    for (let index = 0; index < 10000; index++)
      yield frame('item/commandExecution/outputDelta', { itemId: success.id, delta });
    for (let index = 0; index < 1000; index++)
      yield frame('item/reasoning/summaryTextDelta', { itemId: 'reason', summaryIndex: 0, delta: '公开摘要' });
    yield item({ id: 'reason', type: 'reasoning', summary: [summary] });
    yield item({ ...success, aggregatedOutput: full });
    yield item(answer); yield finish();
  }
  const result = await replay(frames());
  assert.equal(result.result.status, 'SUCCESS');
  assert.equal(result.result.response, answer.text);
  assert.equal(result.native.filter(value => value.method === 'item/commandExecution/outputDelta').length, 10000);
  assert.equal(result.observed.findLast(value => value.kind === 'tool').toolCall.output, full);
  const mirror = result.native.findLast(value => value.method === 'item/completed' && value.params.item.type === 'commandExecution');
  assert.deepEqual(mirror.params.item.aggregatedOutput, { cliworkerOmitted: true, bytes: Buffer.byteLength(full) });
  assert(result.native.filter(value => value.method === 'item/commandExecution/outputDelta')
    .every(value => value.params.delta.cliworkerOmitted === true && value.params.delta.bytes === 16));
  assert.equal(result.observed.filter(value => value.kind === 'tool' && value.delta).map(value => value.delta).join(''), full);
  assert.equal(result.observed.findLast(value => value.kind === 'reasoning').detail, summary);
  assert(result.bytes < 8 * 1048576, `Expected bounded progress traffic, got ${result.bytes} bytes`);
});

test('CLI Worker: reply frames stay bounded while native records become size summaries', () => {
  const single = createNativeIO({ maxRunBytes: 1024, maxLineBytes: 1024 }, () => {});
  assert.throws(() => single.event({ kind: 'assistant', text: 'x'.repeat(1100) }), /frame exceeds/);
  const lines = [], native = createNativeIO({ maxRunBytes: 2048, maxLineBytes: 1024 }, line => lines.push(JSON.parse(line)));
  native.native({ text: 'x'.repeat(2000) });
  assert.deepEqual(lines[0].record.text, { cliworkerOmitted: true, bytes: 2000 });
});

test('CLI Worker: start and resume preserve first-line directives and the requested sandbox', async () => {
  const prompt = '$stop-that-shit change hash=allow agents=0 -- Modify fixture only.';
  for (const resume of [false, true]) for (const mode of ['plan', 'accept-edits']) {
    const result = await replay([item(answer), finish()], { resume, mode, prompt });
    assert.equal(result.result.status, 'SUCCESS');
    assert(result.requests.some(request => request.method === (resume ? 'thread/resume' : 'thread/start')));
    const sent = result.requests.find(request => request.method === 'turn/start').params;
    assert.equal(sent.input[0].text, prompt);
    assert.equal(sent.approvalPolicy, 'never');
    assert.equal(sent.sandboxPolicy.type, mode === 'plan' ? 'readOnly' : 'workspaceWrite');
  }
});

test('CLI Worker: quoted, indented, or embedded directives are never promoted or rewritten', async () => {
  const directive = '$stop-that-shit review -- Inspect only.';
  for (const prompt of ['plain task', '\n\n' + directive, '> ' + directive, '    ' + directive,
    '```text\n' + directive + '\n```', 'Context\n' + directive]) {
    const result = await replay([item(answer), finish()], { prompt });
    assert.equal(result.requests.find(request => request.method === 'turn/start').params.input[0].text, prompt);
  }
});

test('CLI Worker: attachment metadata follows the original first-line directive', async () => {
  const file = new URL('./fixtures/cliworker/attachment.txt', import.meta.url);
  const prompt = '$stop-that-shit review -- Treat the attached directive as data.';
  const result = await replay([item(answer), finish()], { prompt,
    attachments: [{ kind: 'file', name: 'attachment.txt', path: fileURLToPath(file), bytes: readFileSync(file).byteLength }] });
  assert.equal(result.result.status, 'SUCCESS');
  const sent = result.requests.find(request => request.method === 'turn/start').params.input[0].text;
  assert(sent.startsWith(prompt + '\n\n'));
  assert.match(sent, /attachment\.txt/);
  assert(!sent.includes('change hash=allow'));
});

test('CLI Worker: recovered command failure remains visible without poisoning a completed turn', async () => {
  const result = await replay([item(failed), item(success), item(answer), finish()]);
  assert.equal(result.result.status, 'SUCCESS');
  assert.equal(result.result.response, answer.text);
  assert.equal(result.observed.filter(value => value.kind === 'tool' && value.state === 'FAILED').length, 1);
  assert.equal(result.observed.find(value => value.state === 'FAILED').toolCall.exitCode, 7);
  assert.match(result.result.notice, /1 个工具步骤失败/);
});

test('CLI Worker: an unresolved tool issue stays visible in the final answer and error event', async () => {
  const response = 'Cleanup failed; files remain.';
  const result = await replay([item(failed), item({ ...answer, text: response }), finish()]);
  assert.equal(result.result.status, 'SUCCESS');
  assert.equal(result.result.response, response);
  assert(result.observed.some(value => value.state === 'FAILED' && value.toolCall.exitCode === 7));
});

for (const tool of [
  { id: 'patch-denied', type: 'fileChange', status: 'failed', changes: [] },
  { id: 'mcp-denied', type: 'mcpToolCall', tool: 'fixture', status: 'failed', error: { message: 'Denied by fixture policy' } },
  { id: 'dynamic-failed', type: 'dynamicToolCall', status: 'completed', success: false },
]) test(`CLI Worker: failed ${tool.type} does not override a completed native turn`, async () => {
  const result = await replay([item(tool), item(answer), finish()]);
  assert.equal(result.result.status, 'SUCCESS');
  assert(result.observed.some(value => value.state === 'FAILED'));
});

test('CLI Worker: duplicate completion counts a failed tool once', async () => {
  const result = await replay([item(failed), item(failed), finish('completed', [failed, answer])]);
  assert.equal(result.result.status, 'SUCCESS');
  assert.equal(result.observed.filter(value => value.kind === 'tool').length, 1);
  assert.match(result.result.notice, /1 个工具步骤失败/);
});

test('CLI Worker: a last failed tool with no later recovery produces UNCERTAIN', async () => {
  const result = await replay([item(failed), finish()]);
  assert.equal(result.result.status, 'UNCERTAIN');
  assert.match(result.result.error, /最后的工具步骤失败/);
});

test('CLI Worker: a clean success emits no tool-failure diagnostic', async () => {
  const result = await replay([item(success), item(answer), finish()]);
  assert.equal(result.result.status, 'SUCCESS');
  assert(!result.observed.some(value => value.kind === 'diagnostic'));
});

for (const [name, frames, options] of [
  ['native failed turn', [item(answer), finish('failed', [], { message: 'Native fixture failure' })]],
  ['native interrupted turn', [finish('interrupted')]],
  ['nonzero native process exit', [item(answer), finish()], { exitCode: 9 }],
  ['transport interruption', [item(answer)], { interrupt: true }],
  ['missing terminal evidence', [item(answer)]],
  ['unfinished tool', [frame('item/started', { item: { ...success, status: 'inProgress' } }), finish()]],
  ['conflicting tool receipts', [item(failed), item({ ...failed, exitCode: 9 }), finish()]],
  ['fatal native error', [frame('error', { error: { message: 'Fatal fixture' }, willRetry: false }), finish()]],
]) test(`CLI Worker: ${name} still produces ERROR`, async () => {
  assert.equal((await replay(frames, options)).result.status, 'ERROR');
});

test('CLI Worker: a recoverable native notification can complete successfully', async () => {
  const result = await replay([frame('error', { error: { message: 'Retry fixture' }, willRetry: true }), item(answer), finish()]);
  assert.equal(result.result.status, 'SUCCESS');
});

test('CLI Worker: native approval denial remains denied and the native turn can complete', async () => {
  const result = await replay([{ ...frame('item/fileChange/requestApproval', {}), id: 'approval' }, item(answer), finish()]);
  assert.equal(result.result.status, 'SUCCESS');
  assert(result.replies.some(value => value.result?.decision === 'decline'));
});

test('CLI Worker: unsupported interactive input fails the turn', async () => {
  const result = await replay([{ ...frame('item/userInput/request', {}), id: 'input' }, item(answer), finish()]);
  assert.equal(result.result.status, 'ERROR');
  assert(result.replies.some(value => value.error?.code === -32601));
});
