/** Per-message recipients and durable delivery receipts. No inferred cursors. */
import { randomUUID } from 'node:crypto';

export function emptyRelayRoom(parentId) { return { parentId, entries: [], nextSeq: 1 }; }

export function reduceRelayRecord(room, event) {
  if (!room || room.parentId !== event.parentId) room = emptyRelayRoom(event.parentId);
  if (event.op === 'append') return { ...room, nextSeq: event.entry.seq + 1, entries: [...room.entries, event.entry] };
  if (event.op === 'delivery') return { ...room, entries: room.entries.map((entry) => event.seqs.includes(entry.seq) ? {
    ...entry, deliveries: entry.deliveries.map((item) => item.memberId === event.memberId ? { ...item, status: event.status, receipt: event.receipt ?? '', error: event.error ?? '' } : item),
  } : entry) };
  return room;
}

export function createRelayLog({ maxEntries = 5000, maxRooms = 100, read, write } = {}) {
  const rooms = new Map();
  function room(parentId) {
    if (read) { const value = read(parentId); return value?.parentId === parentId ? value : emptyRelayRoom(parentId); }
    return rooms.get(parentId) ?? emptyRelayRoom(parentId);
  }
  async function commit(event) {
    if (write) { await write(event.parentId, event); return; }
    if (!rooms.has(event.parentId) && rooms.size >= maxRooms) throw new Error('议会投递日志已满；未删除任何未确认消息。');
    rooms.set(event.parentId, reduceRelayRecord(room(event.parentId), event));
  }
  return {
    lastSeq(parentId) { return room(parentId).nextSeq - 1; },
    async append(parentId, text, { messageId = randomUUID(), authorId = parentId, recipients = [] } = {}) {
      if (!/^[\w.:-]{1,200}$/u.test(messageId)) throw new Error('message_id 必须为 1–200 位字母、数字、点、冒号、下划线或连字符。');
      const value = room(parentId);
      const targets = [...new Set(recipients)].sort();
      const existing = value.entries.find((entry) => entry.messageId === messageId && entry.authorId === authorId);
      if (existing) {
        if (existing.text !== text || JSON.stringify(existing.deliveries.map((item) => item.memberId)) !== JSON.stringify(targets)) throw new Error('同一 message_id 的内容或收件人不同；不能覆盖已记录消息。');
        return { ...existing, duplicate: true };
      }
      if (text.length > 8000) throw new Error('message 超过 8000 字符。');
      if (value.entries.length >= maxEntries) throw new Error('议会消息日志已满；请新建议会会话，历史与未确认消息均已保留。');
      const entry = { seq: value.nextSeq, messageId, authorId, text, at: Date.now(), deliveries: targets.map((memberId) => ({ memberId, status: 'pending' })) };
      await commit({ parentId, op: 'append', entry });
      return entry;
    },
    pending(parentId, memberId) {
      return room(parentId).entries.filter((entry) => entry.deliveries.some((item) => item.memberId === memberId && item.status === 'pending'));
    },
    uncertain(parentId, memberId) {
      return room(parentId).entries.filter((entry) => entry.deliveries.some((item) => item.memberId === memberId && (item.status === 'sending' || item.status === 'uncertain')));
    },
    mark(parentId, memberId, entries, status, receipt = '', error = '') {
      return commit({ parentId, op: 'delivery', memberId, seqs: entries.map((entry) => entry.seq), status, receipt, error });
    },
    inspect(parentId) { return structuredClone(room(parentId)); },
  };
}
