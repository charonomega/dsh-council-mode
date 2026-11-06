import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assistantText,
  chairAcknowledgement,
  contentText,
  dayLabel,
  finalOpinion,
  formatClock,
  imageAttachments,
  memberRuns,
  mergeRoom,
  mergeTimelineItems,
  showTimestamp,
  subagentChatItems,
  timelineRunId,
  toolArgs,
  userText,
} from '../lib/client-room.js';

// Clock labels use the viewer's local timezone on every platform.
const now = new Date(2026, 9, 23, 12, 30).getTime();

test('text extraction and final opinion marker', () => {
  assert.equal(
    contentText([{ type: 'text', text: '你好' }, { type: 'image' }, { type: 'file', attachment: { name: 'a.pdf' } }]),
    '你好[图片][文件 a.pdf]',
  );
  assert.equal(
    assistantText([{ kind: 'text', text: 'A' }, { kind: 'reasoning', text: 'no' }, { kind: 'text', text: 'B' }]),
    'AB',
  );
  assert.deepEqual(finalOpinion('【最终意见】结论'), { final: true, text: '结论' });
  assert.deepEqual(finalOpinion('普通'), { final: false, text: '普通' });
  assert.deepEqual(toolArgs({ argsRaw: '{"topic":"x"}' }), { topic: 'x' });
  assert.equal(formatClock(now), '12:30');
  assert.equal(dayLabel(now, now), '今天');
  assert.equal(showTimestamp(now, now + 1000), false);
  assert.equal(showTimestamp(now, now + 600000), true);
});

test('minimal relay acknowledgements are hidden from the room', () => {
  assert.equal(chairAcknowledgement('已转达。'), true);
  assert.equal(chairAcknowledgement('已转达给 Codex。'), true);
  assert.equal(chairAcknowledgement('已转达，接下来继续辩论。'), false);
  const items = mergeRoom({
    chatNodes: [
      {
        key: 'ack',
        kind: 'assistant-step',
        data: { time: now, status: 'settled', blocks: [{ kind: 'text', text: '已转达。' }] },
      },
    ],
    members: [],
    roster: { workers: [] },
    timelines: {},
    now,
  });
  assert.equal(items.filter((item) => item.type === 'message').length, 0);
});

test('member runs collapse a run to its final result', () => {
  const member = { workerId: 'w1', name: 'fallback', roleName: '代码审查员', readOnly: true };
  const worker = { id: 'w1', agentName: 'Codex 审查员', preference: { cli: 'codex' }, runId: 'r1', status: 'completed' };
  const snapshot = {
    timeline: [
      { kind: 'user', text: 'prompt', runId: 'r1', time: '2026-10-23T04:20:00Z' },
      { kind: 'assistant', text: '中间稿', runId: 'r1', time: '2026-10-23T04:21:00Z' },
      { kind: 'result', text: '最终答复', runId: 'r1', time: '2026-10-23T04:22:00Z' },
    ],
  };
  const runs = memberRuns(member, worker, snapshot);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].text, '最终答复');
  assert.equal(runs[0].speaker.name, 'Codex 审查员');
  assert.equal(runs[0].speaker.role, '代码审查员');
  assert.equal(runs[0].speaker.workerId, 'w1');
  assert.equal(runs[0].side, 'left');
});

test('real CLI timeline rows derive their run from the durable row id', () => {
  const run1 = '11111111-1111-4111-8111-111111111111';
  const run2 = '22222222-2222-4222-8222-222222222222';
  assert.equal(timelineRunId({ id: `${run1}:event:1`, kind: 'user' }), run1);
  assert.equal(timelineRunId({ id: `${run1}:assistant:0`, kind: 'assistant' }), run1);
  assert.equal(timelineRunId({ id: 'submission:abc', admittedRunId: run2 }), run2);
  assert.equal(timelineRunId({ id: 'submission:abc' }), undefined);
  assert.equal(timelineRunId({ id: `${run1}:event:1`, runId: 'explicit' }), 'explicit');

  const member = { workerId: 'w1', name: 'fallback', roleName: '批评者', readOnly: true };
  const worker = { id: 'w1', agentName: 'Codex 正方', preference: { cli: 'codex' }, status: 'completed' };
  const snapshot = {
    timeline: [
      { id: `${run1}:event:1`, kind: 'user', text: 'prompt 1', time: '2026-10-23T04:20:00Z' },
      { id: `${run1}:assistant:0`, kind: 'assistant', text: '第一轮', step: 0, time: '2026-10-23T04:21:00Z' },
      { id: `${run1}:event:99`, kind: 'status', text: 'completed', time: '2026-10-23T04:21:01Z' },
      { id: `${run2}:event:100`, kind: 'user', text: 'prompt 2', time: '2026-10-23T04:22:00Z' },
      { id: `${run2}:reasoning:0`, kind: 'reasoning', text: '思考摘要', time: '2026-10-23T04:22:01Z' },
      { id: `${run2}:assistant:2`, kind: 'assistant', text: '第二轮', step: 2, time: '2026-10-23T04:23:00Z' },
      { id: `${run2}:event:199`, kind: 'status', text: 'completed', time: '2026-10-23T04:23:01Z' },
    ],
  };
  const runs = memberRuns(member, worker, snapshot);
  assert.deepEqual(runs.map((run) => run.text), ['第一轮', '第二轮']);
  assert.deepEqual(runs.map((run) => run.runId), [run1, run2]);
  assert.equal(runs[0].speaker.name, 'Codex 正方');
});

test('assistant streaming deltas are concatenated without separators', () => {
  const member = { workerId: 'w1', name: 'w1', roleName: '工程师', readOnly: false };
  const worker = { id: 'w1', agentName: 'w1', preference: { cli: 'codex' }, status: 'running' };
  const snapshot = {
    timeline: [
      { kind: 'user', text: 'prompt', runId: 'r1', time: '2026-10-23T04:20:00Z' },
      { kind: 'assistant', text: '已', runId: 'r1', time: '2026-10-23T04:21:00Z' },
      { kind: 'assistant', text: '就绪', runId: 'r1', time: '2026-10-23T04:21:01Z' },
    ],
  };
  const runs = memberRuns(member, worker, snapshot);
  assert.equal(runs[0].text, '已就绪');
});

test('CLI Worker 0.8.7 response identities preserve paragraph boundaries and block whitespace', () => {
  const runId = '11111111-1111-4111-8111-111111111111';
  const worker = { id: 'w1', status: 'completed', runId };
  const timeline = [
    { id: `${runId}:response:["response-a","block-0"]`, kind: 'assistant', text: 'First ',
      response: { id: 'response-a', blockId: 'block-0', index: 0, complete: true } },
    { id: `${runId}:response:["response-a","block-1"]`, kind: 'assistant', text: 'response.',
      response: { id: 'response-a', blockId: 'block-1', index: 1, complete: true } },
    { id: `${runId}:response:["response-b","block-0"]`, kind: 'assistant', text: 'Second response.',
      response: { id: 'response-b', blockId: 'block-0', index: 0, complete: true } },
  ];
  const runs = memberRuns({ workerId: 'w1', name: 'member' }, worker, { timeline });
  assert.equal(runs[0].text, 'First response.\n\nSecond response.');
  assert.equal(runs[0].streaming, false);
  assert.equal(runs[0].runId, runId);
});

test('legacy step boundaries and deltas without response metadata retain their meaning', () => {
  const runs = memberRuns({ workerId: 'w1', name: 'member' }, { status: 'completed' }, {
    timeline: [
      { kind: 'assistant', text: 'First ', step: 0, runId: 'legacy' },
      { kind: 'assistant', text: 'response.', step: 0, runId: 'legacy' },
      { kind: 'assistant', text: 'Second response.', step: 1, runId: 'legacy' },
    ],
  });
  assert.equal(runs[0].text, 'First response.\n\nSecond response.');
});

test('completed member lastResult is shown when its timeline is unavailable', () => {
  const items = mergeRoom({
    chatNodes: [],
    members: [{ workerId: 'w1', name: 'codex-critic', roleName: '反方/风险官', readOnly: true, at: now - 1000 }],
    roster: {
      workers: [
        {
          id: 'w1',
          agentName: 'codex-critic',
          preference: { cli: 'codex' },
          status: 'completed',
          lastResult: '已就绪。反方/风险官到位。',
          createdAt: new Date(now - 1000).toISOString(),
          updatedAt: new Date(now).toISOString(),
        },
      ],
    },
    timelines: {},
    now,
  });
  const message = items.find((item) => item.type === 'message' && item.speaker?.kind === 'member');
  assert.ok(message);
  assert.equal(message.text, '已就绪。反方/风险官到位。');
  assert.equal(message.side, 'left');
});

test('user image attachments render above the text bubble', () => {
  const content = [
    { type: 'text', text: '看图' },
    { type: 'image', attachment: { id: 'img-1', name: 'shot.png', mime: 'image/png' } },
  ];
  assert.equal(userText(content), '看图');
  assert.deepEqual(imageAttachments(content), [
    { attachment: { id: 'img-1', name: 'shot.png', mime: 'image/png' } },
  ]);
  const items = mergeRoom({
    chatNodes: [{ key: 'u-image', kind: 'user', data: { time: now, content } }],
    members: [],
    roster: { workers: [] },
    timelines: {},
    now,
  });
  const message = items.find((item) => item.type === 'message' && item.speaker?.kind === 'user');
  assert.ok(message);
  assert.equal(message.text, '看图');
  assert.equal(message.images.length, 1);
});

test('image-only user messages are kept and have no text', () => {
  const items = mergeRoom({
    chatNodes: [
      {
        key: 'u-image-only',
        kind: 'user',
        data: {
          time: now,
          content: [{ type: 'image', attachment: { id: 'img-2', name: 'only.png' } }],
        },
      },
    ],
    members: [],
    roster: { workers: [] },
    timelines: {},
    now,
  });
  const message = items.find((item) => item.type === 'message' && item.speaker?.kind === 'user');
  assert.ok(message);
  assert.equal(message.text, '');
  assert.equal(message.images.length, 1);
});

test('assistant image blocks are carried into the DSH message', () => {
  const items = mergeRoom({
    chatNodes: [
      {
        key: 'a-image',
        kind: 'assistant-step',
        data: {
          turn: 1,
          time: now,
          status: 'settled',
          blocks: [
            { kind: 'text', text: '生成了一张图' },
            { kind: 'image', attachment: { id: 'img-3', name: 'result.png' } },
          ],
        },
      },
    ],
    members: [],
    roster: { workers: [] },
    timelines: {},
    now,
  });
  const message = items.find((item) => item.type === 'message' && item.speaker?.kind === 'dsh');
  assert.ok(message);
  assert.equal(message.text, '生成了一张图');
  assert.equal(message.images.length, 1);
  assert.equal(message.images[0].attachment.id, 'img-3');
});

test('DSH steps and member runs interleave by actual output time', () => {
  const t0 = now - 10_000;
  const items = mergeRoom({
    chatNodes: [
      {
        key: 'dsh-before',
        kind: 'assistant-step',
        data: { turn: 1, step: 1, time: t0 + 1000, status: 'settled', blocks: [{ kind: 'text', text: '我先说明立场。' }] },
      },
      {
        key: 'dsh-after',
        kind: 'assistant-step',
        data: { turn: 1, step: 2, time: t0 + 5000, status: 'settled', blocks: [{ kind: 'text', text: '【最终意见】总结。' }] },
      },
    ],
    members: [{ workerId: 'w1', name: 'codex-1', roleName: '反方/风险官', readOnly: true, at: t0 }],
    roster: {
      workers: [
        {
          id: 'w1',
          agentName: 'codex-1',
          preference: { cli: 'codex' },
          status: 'completed',
          createdAt: new Date(t0).toISOString(),
        },
      ],
    },
    timelines: {
      w1: {
        timeline: [
          { kind: 'user', text: '请发言', runId: 'r1', time: new Date(t0 + 2000).toISOString() },
          { kind: 'assistant', text: '成员', runId: 'r1', time: new Date(t0 + 3000).toISOString() },
          { kind: 'assistant', text: '中间意见', runId: 'r1', time: new Date(t0 + 3200).toISOString() },
          { kind: 'result', text: '成员中间意见', runId: 'r1', time: new Date(t0 + 4000).toISOString() },
        ],
      },
    },
    now,
  });
  const messages = items.filter((item) => item.type === 'message');
  const sequence = messages.map((item) => `${item.speaker.kind}:${item.text}`);
  assert.deepEqual(sequence, [
    'dsh:我先说明立场。',
    'member:成员中间意见',
    'dsh:总结。',
  ]);
});

test('timeline history merges older pages without duplicating live rows', () => {
  const older = [{ id: 'a' }, { id: 'b' }];
  const live = [{ id: 'b' }, { id: 'c' }];
  assert.deepEqual(mergeTimelineItems(older, live).map((item) => item.id), ['a', 'b', 'c']);
  assert.deepEqual(mergeTimelineItems([{ id: 'x' }], [{ id: 'x' }, { id: 'y' }]).map((item) => item.id), ['x', 'y']);
});

test('native subagent child chat nodes become left member bubbles', () => {
  const nodes = new Map();
  nodes.set('native-step', {
    key: 'native-step',
    kind: 'assistant-step',
    data: {
      time: now,
      status: 'settled',
      blocks: [
        { kind: 'text', text: 'DeepSeek 原生回复' },
        { kind: 'image', attachment: { id: 'img-native', name: 'native.png' } },
      ],
    },
  });
  const items = subagentChatItems(
    [
      {
        kind: 'subagent',
        sessionId: 'child-1',
        workerId: 'child-1',
        name: 'deepseek-1',
        roleName: '研究员',
        readOnly: true,
      },
    ],
    { 'child-1': { chat: { nodes, order: ['native-step'] } } },
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].side, 'left');
  assert.equal(items[0].speaker.kind, 'member');
  assert.equal(items[0].speaker.cli, 'deepseek');
  assert.equal(items[0].speaker.name, 'deepseek-1');
  assert.equal(items[0].text, 'DeepSeek 原生回复');
  assert.equal(items[0].images.length, 1);
  assert.equal(items[0].time, now);
});

test('room merge orders user, DSH, member, and join notice', () => {
  const t0 = now - 60_000;
  const chatNodes = [
    {
      key: 'u1',
      kind: 'user',
      data: { time: t0, content: [{ type: 'text', text: '议题' }], source: { kind: 'user' } },
    },
    {
      key: 'a1',
      kind: 'assistant-step',
      data: { turn: 1, time: t0 + 1000, status: 'settled', blocks: [{ kind: 'text', text: '【最终意见】我的结论' }] },
    },
    {
      key: 't1',
      kind: 'tool-call',
      data: {
        root: {
          callId: 'c1',
          name: 'council_convene',
          phase: 'start',
          time: t0 + 2000,
          argsRaw: '{"topic":"选型"}',
        },
      },
    },
  ];
  const members = [
    { workerId: 'w1', name: 'codex-reviewer', roleName: '代码审查员', readOnly: true, at: t0 + 3000 },
  ];
  const roster = {
    workers: [
      {
        id: 'w1',
        agentName: 'codex-reviewer',
        preference: { cli: 'codex' },
        runId: 'r1',
        status: 'completed',
        createdAt: new Date(t0 + 2500).toISOString(),
      },
    ],
  };
  const timelines = {
    w1: {
      timeline: [
        { kind: 'user', text: '[council:x]', runId: 'r1', time: new Date(t0 + 4000).toISOString() },
        { kind: 'result', text: '成员意见', runId: 'r1', time: new Date(t0 + 5000).toISOString() },
      ],
    },
  };
  const items = mergeRoom({ chatNodes, members, roster, timelines, now });
  const texts = items.map((item) => item.text ?? item.label);
  assert.ok(texts.some((text) => text.includes('议题')));
  assert.ok(texts.some((text) => text.includes('我的结论')));
  assert.ok(texts.some((text) => text.includes('成员意见')));
  assert.ok(texts.some((text) => text.includes('加入了议会')));
  assert.ok(texts.some((text) => text.includes('议会转达')));
  const dsh = items.find((item) => item.type === 'message' && item.speaker?.kind === 'dsh');
  assert.equal(dsh.final, true);
  assert.equal(dsh.side, 'right');
  const memberMessage = items.find((item) => item.type === 'message' && item.speaker?.kind === 'member');
  assert.equal(memberMessage.side, 'left');
});

test('council invitation request messages are hidden from the room', () => {
  const items = mergeRoom({
    chatNodes: [
      {
        key: 'u2',
        kind: 'user',
        data: {
          time: now,
          content: [{ type: 'text', text: '【议会邀请】很长的技术请求' }],
          source: { kind: 'council', form: 'request' },
        },
      },
    ],
    members: [],
    roster: { workers: [] },
    timelines: {},
    now,
  });
  assert.equal(items.filter((item) => item.type === 'message').length, 0);
});

test('running member without a result renders typing', () => {
  const items = mergeRoom({
    chatNodes: [],
    members: [{ workerId: 'w1', name: 'codex', roleName: '工程师', readOnly: false, at: now }],
    roster: {
      workers: [
        {
          id: 'w1',
          agentName: 'codex',
          preference: { cli: 'codex' },
          runId: 'r2',
          status: 'running',
          createdAt: new Date(now).toISOString(),
        },
      ],
    },
    timelines: {
      w1: {
        timeline: [{ kind: 'user', text: '[council:x]', runId: 'r2', time: new Date(now).toISOString() }],
      },
    },
    now,
  });
  const typing = items.find((item) => item.type === 'typing');
  assert.ok(typing);
  assert.deepEqual(typing.names, ['codex']);
});
