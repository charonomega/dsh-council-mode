import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, lstatSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, sep, isAbsolute, win32 } from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { Readable } from 'node:stream';
import vm from 'node:vm';
import { findWindowsPathCommand as sourceLookup } from '../vendor/dsh-cliworker-now/lib/types/host/windows-cli-path.js';
import { ProcessCleanupUnconfirmedError, METADATA_EXIT_GRACE_MS } from '../vendor/dsh-cliworker-now/lib/types/host/process.js';

const bundle = readFileSync(new URL('../vendor/dsh-cliworker-now/lib/index.js', import.meta.url), 'utf8');
function declaration(name) {
  const start = bundle.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const prefix = bundle.slice(start - 6, start) === 'async ' ? start - 6 : start;
  const end = bundle.indexOf('\n}', start) + 2;
  return bundle.slice(prefix, end);
}
const sandbox = { lstatSync, homedir, isAbsolute, join, sep, win32, Buffer, process,
  StringDecoder, AbortSignal, ProcessCleanupUnconfirmedError, METADATA_EXIT_GRACE_MS, Error, Object,
  WINDOWS_PATH_QUERY: 'read-only fixture query' };
const compiledLookup = vm.runInNewContext([
  'windowsCommandCandidates', 'windowsPathDirectories', 'firstPresentWindowsPath', 'findWindowsPathCommand',
].map(declaration).join('\n') + '\nfindWindowsPathCommand', sandbox);
const capture = vm.runInNewContext(declaration('captureCatalogMetadata') + '\ncaptureCatalogMetadata', sandbox);
const options = { env: { SystemRoot: 'C:\\Windows', PATH: '', PATHEXT: '.EXE;.CMD' }, home: tmpdir() };
const empty = () => Promise.resolve('{"user":"","machine":""}');

for (const [name, lookup] of [['source', sourceLookup], ['compiled', compiledLookup]]) {
  test(`${name}: absent Hermes is a normal not-found result`, async () => {
    let count = 0;
    assert.equal(await lookup(['hermes'], async argv => {
      count++;
      assert.match(argv[0], /WindowsPowerShell.*powershell\.exe$/);
      return empty();
    }, new AbortController().signal, options), undefined);
    assert.equal(count, 1);
  });
  test(`${name}: a newly added user PATH is still searched`, async () => {
    const root = mkdtempSync(join(tmpdir(), 'dsh-path-test-'));
    try {
      const file = join(root, 'hermes.exe');
      writeFileSync(file, 'lookup fixture; never executed');
      assert.equal(await lookup(['hermes'], async () => JSON.stringify({ user: root, machine: '' }),
        new AbortController().signal, options), file);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
  test(`${name}: system-query cleanup failure is retryable and retains its cause`, async () => {
    const cause = new ProcessCleanupUnconfirmedError();
    await assert.rejects(lookup(['hermes'], async () => { throw cause; }, new AbortController().signal, options), error => {
      assert.equal(error instanceof ProcessCleanupUnconfirmedError, false);
      assert.equal(error.code, 'CLI_PATH_DISCOVERY_FAILED');
      assert.equal(error.cause, cause);
      assert.match(error.message, /刷新重试/);
      return true;
    });
    assert.equal(await lookup(['hermes'], empty, new AbortController().signal, options), undefined);
  });
  test(`${name}: unrelated errors and cancellation remain errors`, async () => {
    const failure = new Error('permission denied');
    await assert.rejects(lookup(['hermes'], async () => { throw failure; }, new AbortController().signal, options), e => e === failure);
    const controller = new AbortController(); controller.abort(failure);
    let spawned = false;
    await assert.rejects(lookup(['hermes'], async () => { spawned = true; return empty(); }, controller.signal, options), e => e === failure);
    assert.equal(spawned, false);
  });
  test(`${name}: malformed PATH data cannot become a not-found success`, async () => {
    await assert.rejects(lookup(['hermes'], async () => '{"user":7,"machine":""}', new AbortController().signal, options), /PATH/);
  });
}

test('real CLI metadata cleanup failures still use the quarantine error', async () => {
  const backend = { spawn: () => ({ stdout: Readable.from(['ok']), stderr: Readable.from([]),
    done: Promise.resolve({ exitCode: 0 }), terminate() {}, waitForExit: async () => { throw new Error('range observation failed'); } }) };
  await assert.rejects(capture(backend, { graceMs: 1, maxRunBytes: 1024 }, ['real-cli'], tmpdir(), new AbortController().signal),
    error => error instanceof ProcessCleanupUnconfirmedError);
});
test('confirmed metadata cleanup still returns the complete output', async () => {
  const backend = { spawn: () => ({ stdout: Readable.from(['完整', '结果']), stderr: Readable.from([]),
    done: Promise.resolve({ exitCode: 0 }), terminate() {}, waitForExit: async () => true }) };
  assert.equal(await capture(backend, { graceMs: 1, maxRunBytes: 1024 }, ['real-cli'], tmpdir(), new AbortController().signal), '完整结果');
});

// Exercise the published account error branches without loading the DSH host or
// touching a real account. Only executable discovery is substituted.
const accountSource = readFileSync(new URL('../vendor/dsh-cliworker-now/lib/types/host/accounts.js', import.meta.url), 'utf8');
for (const [name, code] of [['source', accountSource], ['compiled', bundle]]) {
  function accountFixture(resolveCliExecutable) {
    const method = code.match(/async readStatus\(cli, cwd, signal, \{ renew = true \} = \{\}\)\s*\{[\s\S]*?(?=\n[ \t]+\/\*\* The login still exists)/)?.[0];
    assert.ok(method, 'published AccountManager.readStatus must be present');
    class WindowsCliNotFoundError extends Error {}
    const readStatus = vm.runInNewContext(`({ ${method} }).readStatus`, {
      resolveCliExecutable, ProcessCleanupUnconfirmedError, WindowsCliNotFoundError,
      setTimeout, clearTimeout, AbortController, AbortSignal, STATUS_TIMEOUT: 1000,
    });
    const quarantined = [];
    const manager = { unsafeQueries: new Set(), unsafeTerminals: new Map(),
      controller: new AbortController(), backend: {}, config: {},
      cleanupHold(cli) { return this.unsafeQueries.has(cli) ? { cli, state: 'unavailable', installed: true } : undefined; },
      quarantineQuery(cli) { this.unsafeQueries.add(cli); quarantined.push(cli); } };
    return { WindowsCliNotFoundError, quarantined, manager,
      status: () => readStatus.call(manager, 'hermes', tmpdir(), new AbortController().signal) };
  }
  test(`${name}: failed PATH discovery never marks Hermes installed or quarantined; the next read retries`, async () => {
    let count = 0;
    const fixture = accountFixture(async () => {
      count++;
      if (count === 1) throw Object.assign(new Error('Windows CLI 安装路径探测暂时失败，请刷新重试'), { code: 'CLI_PATH_DISCOVERY_FAILED' });
      throw new fixture.WindowsCliNotFoundError('尚未安装 CLI，请检查安装');
    });
    const first = await fixture.status(), next = await fixture.status();
    assert.equal(first.installed, false);
    assert.equal(first.state, 'unavailable');
    assert.equal(next.installed, false);
    assert.equal(next.state, 'unconfigured');
    assert.equal(count, 2);
    assert.equal(fixture.manager.unsafeQueries.size, 0);
    assert.equal(fixture.quarantined.length, 0);
  });
  test(`${name}: a real cleanup error still quarantines and prevents another CLI query`, async () => {
    let count = 0;
    const fixture = accountFixture(async () => { count++; throw new ProcessCleanupUnconfirmedError(); });
    assert.equal((await fixture.status()).state, 'unavailable');
    assert.equal(fixture.manager.unsafeQueries.has('hermes'), true);
    assert.deepEqual(fixture.quarantined, ['hermes']);
    assert.equal((await fixture.status()).state, 'unavailable');
    assert.equal(count, 1);
  });
}
