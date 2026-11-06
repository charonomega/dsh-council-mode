/** Pure room projection helpers shared by the browser bundle and its tests. */

/** Split content blocks into display text (user messages). */
export function contentText(blocks) {
  if (!Array.isArray(blocks)) return '';
  const parts = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    else if (block.type === 'image') parts.push('[图片]');
    else if (block.type === 'file') parts.push(`[文件${block.attachment?.name ? ` ${block.attachment.name}` : ''}]`);
  }
  return parts.join('').trim();
}

/** Text shown in the bubble when image blocks render as real images above it. */
export function userText(blocks) {
  if (!Array.isArray(blocks)) return '';
  const parts = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text);
    else if (block.type === 'file') parts.push(`[文件${block.attachment?.name ? ` ${block.attachment.name}` : ''}]`);
  }
  return parts.join('').trim();
}

/** Collect image attachments from user content (type) or assistant blocks (kind). */
export function imageAttachments(blocks, discriminator = 'type') {
  if (!Array.isArray(blocks)) return [];
  const images = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block[discriminator] !== 'image' || !block.attachment) continue;
    images.push({ attachment: block.attachment });
  }
  return images;
}

/** Keep row order, but replace each durable id with its freshest snapshot.
 * Callers pass older history first and current/live rows last. A CLI row is
 * mutable: its text and streaming metadata change without changing its id.
 */
export function mergeTimelineItems(...lists) {
  const rows = new Map();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item.id !== 'string') continue;
      // Replace the whole row so terminal frames can also remove old flags.
      rows.set(item.id, item);
    }
  }
  return [...rows.values()];
}

/** Roster and member watch streams can arrive in either order. */
export function currentMemberWorker(member, roster, snapshot) {
  const listed = (roster?.workers ?? []).find((worker) => worker.id === member.workerId);
  const selected = snapshot?.selected?.id === member.workerId ? snapshot.selected : undefined;
  if (!selected) return listed;
  if (Number.isFinite(roster?.revision) && Number.isFinite(snapshot?.revision) && roster.revision > snapshot.revision) return listed;
  return selected;
}

/** Join assistant text blocks, ignoring reasoning and tool protocol material. */
export function assistantText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((block) => block && block.kind === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('')
    .trim();
}

/** A minimal relay acknowledgement is a tool status, not chair commentary. */
export function chairAcknowledgement(text) {
  return /^已转达(?:给[^。\n]{1,40})?。?$/u.test(String(text ?? '').trim());
}

/** Strip the final-opinion prefix and report whether it was present. */
export function finalOpinion(text) {
  const value = String(text ?? '').trim();
  if (!/^【最终意见】/u.test(value)) return { final: false, text: value };
  return { final: true, text: value.replace(/^【最终意见】\s*/u, '') };
}

/** Parse a tool-call root's raw argument JSON, when present. */
export function toolArgs(root) {
  if (!root || typeof root !== 'object') return {};
  const raw = root.argsRaw ?? root.call?.argsRaw ?? '';
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** Format a clock time as HH:MM. */
export function formatClock(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Stable local day key. */
export function dayKey(ms) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return 'invalid';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Day separator label using caller-supplied localized words. */
export function dayLabel(ms, nowMs, labels = {}) {
  const key = dayKey(ms);
  if (key === dayKey(nowMs)) return labels.today ?? '今天';
  if (key === dayKey(nowMs - 86_400_000)) return labels.yesterday ?? '昨天';
  return key;
}

/** Whether a message gap deserves its own timestamp row. */
export function showTimestamp(previousMs, currentMs, gapMs = 5 * 60_000) {
  if (!Number.isFinite(previousMs) || !Number.isFinite(currentMs)) return true;
  return currentMs - previousMs >= gapMs || currentMs < previousMs;
}

function parseTime(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function clip(text, limit) {
  const value = String(text ?? '').trim();
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

const RUN_ID_PREFIX = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/**
 * The CLI Worker timeline does not serialise `runId`; its durable row id is
 * `${runId}:...`, and queued follow-ups carry `admittedRunId`. Derive the run
 * from the same fields the CLI Worker client uses so every run keeps its own
 * bubble instead of falling back to only the latest `lastResult`.
 */
export function timelineRunId(item) {
  if (!item || typeof item !== 'object') return undefined;
  const admitted = typeof item.admittedRunId === 'string' ? item.admittedRunId.trim() : '';
  if (admitted !== '') return admitted;
  const explicit = typeof item.runId === 'string' ? item.runId.trim() : '';
  if (explicit !== '') return explicit;
  const id = typeof item.id === 'string' ? item.id : '';
  if (id === '') return undefined;
  const column = id.indexOf(':');
  const prefix = column > 0 ? id.slice(0, column) : id;
  return RUN_ID_PREFIX.test(prefix) ? prefix : undefined;
}

/** Join deltas within one response, preserving explicit response/step boundaries. */
function assistantRunText(items) {
  let text = '';
  let lastStep;
  let lastResponse;
  for (const item of items) {
    const step = item.step;
    const response = item.responseId;
    const changedResponse = response !== undefined && lastResponse !== undefined && response !== lastResponse;
    const changedStep = response === undefined && lastResponse === undefined &&
      step !== undefined && lastStep !== undefined && step !== lastStep;
    if (text !== '' && (changedResponse || changedStep)) text += '\n\n';
    text += item.text;
    lastStep = step;
    lastResponse = response;
  }
  return text.trim();
}

/** Build one member's run bubbles from its watch snapshot. */
export function memberRuns(member, worker, snapshot, limit = 200) {
  const timeline = Array.isArray(snapshot?.timeline) ? snapshot.timeline : [];
  const groups = new Map();
  for (const item of timeline) {
    const runId = timelineRunId(item);
    if (runId === undefined) continue;
    let group = groups.get(runId);
    if (!group) {
      group = {
        runId,
        user: undefined,
        result: '',
        assistant: [],
        time: undefined,
        resultTime: undefined,
        firstAssistantTime: undefined,
      };
      groups.set(runId, group);
    }
    const time = parseTime(item.time);
    if (group.time === undefined && time !== undefined) group.time = time;
    if (item.kind === 'user' && group.user === undefined) group.user = item;
    if (item.kind === 'result' && typeof item.text === 'string' && item.text.trim() !== '') {
      group.result = item.text.trim();
      if (group.resultTime === undefined) group.resultTime = time;
    }
    if (item.kind === 'assistant' && typeof item.text === 'string' && item.text.trim() !== '') {
      if (group.firstAssistantTime === undefined) group.firstAssistantTime = time;
      group.assistant.push({ text: item.text, step: item.step, responseId: item.response?.id });
    }
  }
  const cli = worker?.preference?.cli ?? '';
  const name = worker?.agentName || member.name;
  const runs = [];
  for (const group of groups.values()) {
    const text = group.result || assistantRunText(group.assistant);
    if (text === '') continue;
    const time =
      group.firstAssistantTime ??
      group.resultTime ??
      parseTime(group.user?.time) ??
      group.time ??
      0;
    runs.push({
      type: 'message',
      id: `run:${member.workerId}:${group.runId}`,
      side: 'left',
      speaker: {
        kind: 'member',
        name,
        role: member.roleName,
        cli,
        readOnly: worker ? (worker.mode === 'plan' || worker.mode === 'read-only') : member.effectivePermission === 'read-only',
        workerId: member.workerId,
      },
      text,
      time,
      streaming:
        group.result === '' &&
        group.runId === worker?.runId &&
        (worker?.status === 'running' || worker?.status === 'queued' || worker?.status === 'stopping'),
      runId: group.runId,
    });
  }
  runs.sort((left, right) => left.time - right.time);
  return runs.slice(-limit);
}

function notice(id, text, time, tone = 'system') {
  return { type: 'notice', id, text, time, tone };
}

function commandNotice(node, labels = {}) {
  const data = node.data ?? {};
  if (data.name !== 'council') return undefined;
  const args = String(data.args ?? '').trim();
  const verb = args.split(/\s+/u)[0] ?? '';
  let text = '';
  if (verb === '' || verb === 'on') text = labels.commandOn ?? '议会模式已开启';
  else if (verb === 'off') text = labels.commandOff ?? '议会模式已关闭';
  else if (verb === 'invite') text = labels.commandInvite ?? '已请求邀请成员加入议会';
  else if (verb === 'status') return undefined;
  else text = labels.command?.(clip(args, 60)) ?? `议会命令：${clip(args, 60)}`;
  return notice(`command:${data.commandId ?? node.key}`, text, data.time ?? 0, 'command');
}

function toolNotices(node, labels = {}) {
  const root = node.data?.root;
  if (!root || typeof root !== 'object') return [];
  const name = root.name;
  if (name === 'council_convene') {
    const args = toolArgs(root);
    const topic = clip(args.message ?? args.topic ?? labels.topicFallback ?? '议题', 60);
    return [
      notice(
        `tool:${root.callId ?? node.key}`,
        labels.convene?.(topic) ?? `议会转达新消息：${topic}`,
        root.time ?? 0,
        'phase',
      ),
    ];
  }
  if (name === 'council_assign') {
    const args = toolArgs(root);
    const list = Array.isArray(args.assignments) ? args.assignments : [];
    return list.slice(0, 6).flatMap((item, index) => {
      if (!item || typeof item.member !== 'string' || typeof item.task !== 'string') return [];
      const reason = typeof item.reason === 'string' && item.reason.trim() !== '' ? clip(item.reason, 40) : '';
      return [
        notice(
          `tool:${root.callId ?? node.key}:${index}`,
          labels.assign?.(clip(item.member, 30), clip(item.task, 80), reason) ??
            `任务分配：${clip(item.member, 30)} — ${clip(item.task, 80)}${reason ? `（${reason}）` : ''}`,
          root.time ?? 0,
          'assign',
        ),
      ];
    });
  }
  if (name === 'cliworker_start') {
    const args = toolArgs(root);
    const who = clip(args.agent_name || args.title || args.cli || labels.memberFallback || '成员', 40);
    return [
      notice(
        `tool:${root.callId ?? node.key}`,
        labels.inviting?.(who) ?? `DSH 正在邀请 ${who}`,
        root.time ?? 0,
        'phase',
      ),
    ];
  }
  if (name === 'cliworker_followup') {
    const args = toolArgs(root);
    const who = clip(args.worker_name || args.worker_id || labels.memberFallback || '成员', 40);
    return [
      notice(
        `tool:${root.callId ?? node.key}`,
        labels.contacting?.(who) ?? `DSH 联系了 ${who}`,
        root.time ?? 0,
        'phase',
      ),
    ];
  }
  return [];
}

function chatItems(chatNodes, labels = {}) {
  const items = [];
  for (const node of chatNodes) {
    if (!node || node.visibility === 'hidden') continue;
    const data = node.data ?? {};
    if (node.kind === 'user' || node.kind === 'steering') {
      if (data.source && data.source.kind === 'council') continue;
      const images = imageAttachments(data.content, 'type');
      const text = userText(data.content);
      if (text === '' && images.length === 0) continue;
      items.push({
        type: 'message',
        id: `user:${node.key}`,
        side: 'right',
        speaker: { kind: 'user', name: 'me' },
        text,
        images,
        time: Number(data.time ?? 0),
      });
      continue;
    }
    if (node.kind === 'assistant-step') {
      // One bubble per Assistant step: a long DSH turn may contain text before
      // a blocking tool call and the final answer after it. Merging by turn
      // hides the real discussion order and makes the whole turn one bubble.
      const text = assistantText(data.blocks);
      const images = imageAttachments(data.blocks, 'kind');
      if (text === '' && images.length === 0) continue;
      if (images.length === 0 && chairAcknowledgement(text)) continue;
      const opinion = finalOpinion(text);
      items.push({
        type: 'message',
        id: `assistant:${node.key}`,
        side: 'right',
        speaker: { kind: 'dsh', name: 'DSH', role: '群主' },
        text: opinion.text,
        images,
        time: Number(data.time ?? 0),
        streaming: data.status === 'running',
        interrupted: data.status === 'interrupted',
        final: opinion.final,
      });
      continue;
    }
    if (node.kind === 'command') {
      const item = commandNotice(node, labels);
      if (item) items.push(item);
      continue;
    }
    if (node.kind === 'tool-call') {
      items.push(...toolNotices(node, labels));
      continue;
    }
    if (node.kind === 'turn-error') {
      const detail = data.message ? `：${clip(data.message, 120)}` : '';
      items.push(
        notice(
          `error:${node.key}`,
          labels.turnFailed?.(detail) ?? `本轮出错${detail}`,
          data.time ?? 0,
          'error',
        ),
      );
    }
  }
  return items;
}

/** Build room items for native DSH subagent members from their child chat snapshots. */
export function subagentChatItems(members, snapshots) {
  const items = [];
  for (const member of members ?? []) {
    if (!member || member.kind !== 'subagent') continue;
    const childId = member.sessionId || member.workerId;
    const entry = snapshots?.[childId];
    const snapshot = entry?.chat;
    const nodes = snapshot?.nodes;
    const order = snapshot?.order;
    if (!nodes || !Array.isArray(order)) continue;
    const speaker = {
      kind: 'member',
      name: member.name,
      role: member.roleName,
      cli: 'deepseek',
      readOnly: member.effectivePermission === 'read-only',
      workerId: childId,
      native: true,
    };
    for (const nodeKey of order) {
      const node = nodes.get(nodeKey);
      if (!node || node.visibility === 'hidden') continue;
      const data = node.data ?? {};
      if (node.kind === 'assistant-step') {
        const text = assistantText(data.blocks);
        const images = imageAttachments(data.blocks, 'kind');
        if (text === '' && images.length === 0) continue;
        items.push({
          type: 'message',
          id: `subagent:${childId}:${node.key}`,
          side: 'left',
          speaker,
          text,
          images,
          time: Number(data.time ?? 0),
          streaming: data.status === 'running',
          runId: node.key,
          imageSessionId: childId,
          loadImage: entry.loadImage,
          cwd: entry.cwd,
        });
      } else if (node.kind === 'turn-error') {
        const detail = data.message ? `：${clip(data.message, 120)}` : '';
        items.push(
          notice(
            `subagent-error:${childId}:${node.key}`,
            `成员 ${member.name} 出错${detail}`,
            Number(data.time ?? 0),
            'error',
          ),
        );
      }
    }
  }
  return items;
}

/**
 * Merge DSH chat nodes, native subagent chat nodes, member runs, and join notices into one chronological list.
 * `timelines` is keyed by CLI Worker id; `subagentItems` are already native member messages.
 */
/** Canonical speech log; tool receipts and provider token streams never fan out. */
export function autonomousRoomItems(room) {
  if (!room) return [];
  const names = new Map(room.members.map((m) => [m.sessionId || m.workerId, m]));
  const items = room.messages.map((m) => {
    const author = names.get(m.authorMemberId), user = m.authorMemberId === 'user';
    return { type: 'message', id: `room:${m.messageId}`, time: m.createdAt,
      side: user ? 'right' : 'left', text: m.content,
      routeLabel: `#${m.seq} → ${m.recipients.map((id) => names.get(id)?.name || id).join('、')}${m.replyTo ? ` · 回复 #${room.messages.find((x) => x.messageId === m.replyTo)?.seq ?? '?'}` : ''}`,
      speaker: user ? { kind: 'user', name: 'me' } : { kind: 'member', name: author?.name || m.authorMemberId,
        role: author?.roleName || '', cli: author?.cli || '', workerId: m.authorMemberId, readOnly: author?.effectivePermission === 'read-only' } };
  });
  const running = room.deliveries.filter((d) => ['sending', 'accepted'].includes(d.status)).map((d) => names.get(d.memberId)?.name || d.memberId);
  if (running.length) items.push({ type: 'typing', id: `room-typing:${room.id}`, names: running, time: Date.now() });
  return items;
}

export function mergeRoom({
  chatNodes,
  subagentItems = [],
  members,
  roster,
  timelines,
  now = Date.now(),
  labels = {},
}) {
  const items = [...chatItems(chatNodes ?? [], labels), ...(Array.isArray(subagentItems) ? subagentItems : [])];
  const typing = [];

  for (const member of members ?? []) {
    const snapshot = timelines?.[member.workerId];
    const worker = currentMemberWorker(member, roster, snapshot);
    const joinedAt = parseTime(member.at);
    const createdAt = parseTime(worker?.createdAt);
    const when =
      joinedAt !== undefined && createdAt !== undefined
        ? Math.min(joinedAt, createdAt)
        : (joinedAt ?? createdAt ?? 0);
    const memberName = worker?.agentName || member.name;
    items.push(
      notice(
        `join:${member.workerId}`,
        labels.join?.(memberName, member.roleName) ?? `DSH 邀请 ${memberName} 加入了议会 · ${member.roleName}`,
        when,
        'join',
      ),
    );
    const runs = memberRuns(member, worker, snapshot);
    if (
      runs.length === 0 &&
      typeof worker?.lastResult === 'string' &&
      worker.lastResult.trim() !== '' &&
      worker.status !== 'running' &&
      worker.status !== 'queued' &&
      worker.status !== 'stopping'
    ) {
      runs.push({
        type: 'message',
        id: `run:${member.workerId}:last-result`,
        side: 'left',
        speaker: {
          kind: 'member',
          name: memberName,
          role: member.roleName,
          cli: worker.preference?.cli ?? '',
          readOnly: worker ? (worker.mode === 'plan' || worker.mode === 'read-only') : member.effectivePermission === 'read-only',
          workerId: member.workerId,
        },
        text: worker.lastResult.trim(),
        time: parseTime(worker.updatedAt) ?? parseTime(worker.createdAt) ?? now,
        runId: 'last-result',
      });
    }
    items.push(...runs);
    if (worker?.status === 'running' || worker?.status === 'queued') {
      const latest = runs[runs.length - 1];
      if (!latest || latest.runId !== worker.runId) typing.push(memberName);
    }
    if (worker?.status === 'failed' && worker.error) {
      items.push(
        notice(
          `member-error:${member.workerId}`,
          labels.memberFailed?.(memberName, clip(worker.error, 120)) ??
            `${memberName} 本轮失败：${clip(worker.error, 120)}`,
          now,
          'error',
        ),
      );
    }
  }

  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  unique.sort((left, right) => {
    if (left.time !== right.time) return left.time - right.time;
    const rank = { day: 0, notice: 1, message: 2, typing: 3 };
    return (rank[left.type] ?? 9) - (rank[right.type] ?? 9);
  });

  const withDays = [];
  let lastDay = '';
  let lastTime;
  for (const item of unique) {
    const key = dayKey(item.time);
    if (key !== lastDay) {
      lastDay = key;
      withDays.push({
        type: 'day',
        id: `day:${key}:${item.id}`,
        time: item.time,
        label: dayLabel(item.time, now, labels),
      });
      lastTime = undefined;
    }
    if (showTimestamp(lastTime, item.time)) {
      withDays.push({
        type: 'time',
        id: `time:${item.id}`,
        time: item.time,
        label: formatClock(item.time),
      });
    }
    withDays.push(item);
    lastTime = item.time;
  }
  if (typing.length > 0) {
    withDays.push({
      type: 'typing',
      id: 'typing',
      time: now,
      names: [...new Set(typing)],
    });
  }
  return withDays.slice(-300);
}
