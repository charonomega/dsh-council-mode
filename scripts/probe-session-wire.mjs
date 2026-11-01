/** Read-only cold replay of Council parent sessions. No model calls or raw text output. */
import fs from 'node:fs';
import path from 'node:path';
import { zstdDecompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => i % 2 ? pairs : [...pairs, [value.slice(2), all[i + 1]]], []));
for (const key of ['sessions', 'projection', 'config', 'validator', 'output']) if (!args[key]) throw new Error(`Missing --${key}`);
const { createCouncilProjection } = await import(pathToFileURL(path.resolve(args.projection)).href);
const { resolveConfig } = await import(pathToFileURL(path.resolve(args.config)).href);
const { isJsonValue } = await import(pathToFileURL(path.resolve(args.validator)).href);
const projection = createCouncilProjection(resolveConfig({}));

function recordsOf(file) {
  const bytes = fs.readFileSync(file), chunks = [];
  let offset = 0;
  // Node's synchronous Zstd decoder consumes one frame. Session files append
  // multiple frames: continue at bytesWritten instead of stopping at the header.
  while (offset < bytes.length) {
    const decoded = zstdDecompressSync(bytes.subarray(offset), { info: true });
    if (decoded.engine.bytesWritten <= 0) throw new Error('Zstd frame made no progress');
    chunks.push(decoded.buffer);
    offset += decoded.engine.bytesWritten;
  }
  return { bytes, rows: Buffer.concat(chunks).toString('utf8').trim().split('\n').filter(Boolean).map(JSON.parse) };
}

function undefinedPaths(value, at = '$', found = []) {
  if (value === undefined) found.push(at);
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) undefinedPaths(entry, `${at}.${key}`, found);
  }
  return found;
}

const results = [];
for (const workspace of fs.readdirSync(args.sessions, { withFileTypes: true })) {
  if (!workspace.isDirectory()) continue;
  const directory = path.join(args.sessions, workspace.name);
  for (const session of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!session.isDirectory() || !session.name.startsWith('session-')) continue;
    const file = path.join(directory, session.name, 'session.v4.jsonl.zstd');
    if (!fs.existsSync(file)) continue;
    const { bytes, rows } = recordsOf(file);
    const council = rows.some((row) => row.type === 'command/run' && row.data?.name === 'council' || row.type === 'tool/call' && row.data?.name?.startsWith('council_'));
    if (!council) continue;
    let state = projection.init();
    for (const row of rows) state = projection.apply(state, row);
    const view = projection.wire.view(state);
    results.push({ sessionId: session.name, records: rows.length, bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      active: state.active, members: state.members.length, assignments: state.assignments.length,
      hostIsJsonValue: isJsonValue(view), undefinedPaths: undefinedPaths(view) });
    if (args.backup) {
      fs.mkdirSync(args.backup, { recursive: true });
      const destination = path.join(args.backup, session.name + '.v4.jsonl.zstd');
      if (!fs.existsSync(destination)) fs.writeFileSync(destination, bytes);
    }
  }
}
const summary = { sessions: results, passing: results.filter((item) => item.hostIsJsonValue).length,
  failing: results.filter((item) => !item.hostIsJsonValue).length, modelCalls: 0 };
fs.writeFileSync(args.output, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
