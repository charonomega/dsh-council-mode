/** Read-only replay of one saved CLI Worker through old/new Council renderers.
 * Saves counts and hashes, never conversation text. --fixture emits scrubbed rows.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, i, all) => i % 2 ? pairs : [...pairs, [value.slice(2), all[i + 1]]], []));
for (const key of ['worker', 'fold', 'before', 'after', 'output']) if (!args[key]) throw new Error(`Missing --${key}`);
const worker = JSON.parse(fs.readFileSync(args.worker, 'utf8'));
const eventPath = path.join(path.dirname(args.worker), worker.id + '.events.jsonl');
const events = fs.readFileSync(eventPath, 'utf8').trim().split('\n').map(JSON.parse);
const { foldEvents } = await import(pathToFileURL(path.resolve(args.fold)).href);
const before = await import(pathToFileURL(path.resolve(args.before)).href);
const after = await import(pathToFileURL(path.resolve(args.after)).href);
const snapshots = [];
let selected = { ...worker, status: 'queued' }, changed = 0, previous = new Map();
for (let i = 0; i < events.length; i++) {
  const event = events[i];
  if (event.runId !== selected.runId) selected = { ...selected, runId: event.runId, status: 'running' };
  if (event.kind === 'status' && event.state) selected = { ...selected, status: event.state };
  const active = ['queued', 'running', 'stopping'].includes(selected.status);
  const rows = foldEvents(events.slice(0, i + 1), active ? undefined : { runId: selected.runId, status: selected.status }, 'codex');
  for (const row of rows) {
    if (previous.has(row.id) && previous.get(row.id) !== row.text) changed++;
    previous.set(row.id, row.text);
  }
  snapshots.push({ selected: { ...selected }, revision: i + 1, timeline: rows, truncated: false });
}
const member = { workerId: worker.id, name: worker.agentName };
const digest = (text) => createHash('sha256').update(text).digest('hex');
const describe = (rows) => rows.map((row) => ({ runId: row.runId, chars: row.text.length, sha256: digest(row.text), streaming: row.streaming }));
function replay(renderer) {
  let timeline = [];
  for (const snapshot of snapshots) timeline = renderer.mergeTimelineItems(timeline, snapshot.timeline);
  return renderer.memberRuns(member, worker, { timeline });
}
const oldRows = replay(before), newRows = replay(after);
const fresh = after.memberRuns(member, worker, snapshots.at(-1));
const result = { parentSessionId: worker.parentSessionId, workerId: worker.id, events: events.length, sameIdTextChanges: changed,
  before: describe(oldRows), after: describe(newRows), fresh: describe(fresh),
  allFinalTextsMatch: newRows.length === fresh.length && newRows.every((row, i) => row.text === fresh[i].text), modelCalls: 0 };
fs.writeFileSync(args.output, JSON.stringify(result, null, 2) + '\n');
if (args.fixture) {
  const frames = snapshots.filter((snapshot, i) => i % 50 === 0 || (snapshot.selected.status === 'completed' && snapshots[i - 1]?.selected.status !== 'completed') || i === snapshots.length - 1);
  const clean = frames.map((snapshot) => ({ revision: snapshot.revision, truncated: false,
    selected: { id: 'fixture-worker', runId: snapshot.selected.runId, status: snapshot.selected.status, preference: { cli: 'codex' } },
    timeline: snapshot.timeline.map(({ id, kind, text, time, step, admittedRunId }) => ({ id, kind, time, step, admittedRunId,
      text: kind === 'assistant' || kind === 'result' ? 'x'.repeat(text?.length ?? 0) : kind === 'user' ? 'fixture prompt' : kind })),
  }));
  fs.writeFileSync(args.fixture, JSON.stringify({ source: 'Scrubbed structural snapshots from CLI Worker 0.8.2; original text removed', events: events.length, snapshots: clean }, null, 2) + '\n');
}
console.log(JSON.stringify({ events: result.events, sameIdTextChanges: changed, beforeChars: oldRows.map((row) => row.text.length), afterChars: newRows.map((row) => row.text.length), allFinalTextsMatch: result.allFinalTextsMatch }));
if (!result.allFinalTextsMatch) process.exitCode = 1;
