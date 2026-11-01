import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { replay, frame, item, finish, answer, failed, success } from './fixtures/cliworker/native-replay.mjs';
import { progressPreview, createProgressPreviews } from '../vendor/dsh-cliworker-now/lib/codex-progress-preview.mjs';
import { createNativeIO } from '../vendor/dsh-cliworker-now/lib/native-transport.mjs';

test('CLI Worker: UTF-8 previews stay within 4 KiB and preserve small output', () => {
  for (const text of ['small\n', '汉字😀'.repeat(2000)]) {
    const output = progressPreview(text);
    assert(Buffer.byteLength(output) <= 4096);
    assert(!output.includes('\ufffd'));
    if (Buffer.byteLength(text) <= 4096) assert.equal(output, text);
    else assert(output.startsWith('[预览已截断'));
  }
});

test('CLI Worker: previews coalesce, suppress duplicates, and flush the final update once', () => {
  let now = 0;
  const events = [], previews = createProgressPreviews(event => events.push(event), () => now);
  const event = detail => ({ kind: 'tool', state: 'RUNNING', detail, toolCall: { output: detail } });
  previews.update('a', event('first')); now = 100;
  previews.update('a', event('second')); previews.update('a', event('third'));
  assert.equal(events.length, 1);
  now = 251; previews.update('a', event('fourth')); assert.equal(events.length, 2);
  now = 300; previews.update('a', event('last')); previews.finish('a'); previews.flush();
  assert.equal(events.length, 3); assert.equal(events.at(-1).detail, 'last');
  previews.update('b', event('same')); now = 600; previews.update('b', event('same')); previews.finish('b');
  assert.equal(events.length, 4);
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
  assert.equal(result.native.findLast(value => value.method === 'item/completed' && value.params.item.type === 'commandExecution').params.item.aggregatedOutput, full);
  assert.equal(result.observed.findLast(value => value.kind === 'reasoning').detail, summary);
  assert(result.bytes < 8 * 1048576, `Expected bounded progress traffic, got ${result.bytes} bytes`);
});

test('CLI Worker: frame and total-output limits still reject real oversize', () => {
  const single = createNativeIO({ maxRunBytes: 1024, maxLineBytes: 1024 }, () => {});
  assert.throws(() => single.native({ text: 'x'.repeat(1100) }), /frame exceeds/);
  const total = createNativeIO({ maxRunBytes: 2048, maxLineBytes: 1024 }, () => {});
  assert.throws(() => { for (let i = 0; i < 10; i++) total.native({ text: 'x'.repeat(500) }); }, /output exceeds run limit/);
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
  assert.equal(result.observed.filter(value => value.kind === 'diagnostic').length, 1);
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
  assert.match(result.observed.find(value => value.kind === 'diagnostic').text, /1 次/);
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

test('CLI Worker: unsupported approval stays denied and fails the turn', async () => {
  const result = await replay([{ ...frame('item/fileChange/requestApproval', {}), id: 'approval' }, item(answer), finish()]);
  assert.equal(result.result.status, 'ERROR');
  assert(result.replies.some(value => value.result?.decision === 'decline'));
});
