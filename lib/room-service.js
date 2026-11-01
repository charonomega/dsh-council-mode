/** Durable, bounded, model-independent room routing. No LLM runs in post/read/yield. */
import { randomUUID } from 'node:crypto';
import { memberKey, resolveMember } from './members.js';

const liveDelivery = (d) => d.status === 'sending' || d.status === 'accepted';
const visible = (m, id) => m.authorMemberId === id || m.recipients.includes(id);
const clean = (x) => JSON.parse(JSON.stringify(x));
const messageLimitReached = (room) => room.unlimited !== true && room.messages.length >= room.limits.maxMessages;
const turnLimitReached = (room, id) => room.unlimited !== true && room.deliveries.filter((d) => d.memberId === id && d.status !== 'retry').length >= room.limits.maxTurnsPerMember;

export function roomView(room, owner) {
  if (!room) return null;
  if (room.owner === owner) return room;
  return { ...room, status: room.status === 'stopped' ? 'stopped' : 'paused', reason: '宿主已重启；请核对未确认投递后继续。',
    deliveries: room.deliveries.map((d) => liveDelivery(d) ? { ...d, status: 'uncertain' } : d) };
}

export function roomPrompt(room, member, batch) {
  const id = memberKey(member);
  const initialized = room.deliveries.some((d) => d.memberId === id && d.readAt !== undefined);
  return `${initialized ? '' : '通过 DSH 的 skill 工具加载 dsh-council-member（仅首次，无需搜索本地文件）。'}council_inbox 有 ${batch.length} 条新消息。`;
}

/** read/write are backed by the parent's session log; run runs outside tool ALS. */
export function createRoomService({ read, write, run, ready = async () => true, release = async () => {}, config,
  owner = randomUUID(), now = Date.now, intervalMs = 250, onError = () => {} }) {
  const parents = new Map(), locks = new Map(), flights = new Map();
  let disposed = false, ticking = false;
  const keyOf = (parentId, memberId) => `${parentId}:${memberId}`;
  function serial(id, fn) {
    const task = (locks.get(id) ?? Promise.resolve()).catch(() => {}).then(fn);
    locks.set(id, task);
    void task.finally(() => { if (locks.get(id) === task) locks.delete(id); }).catch(() => {});
    return task;
  }
  async function update(parent, fn) {
    return serial(parent.id, async () => {
      if (disposed) throw new Error('议会插件已停止。');
      let room = read(parent);
      let draft = room ? clean(roomView(room, owner)) : null;
      const result = await fn(draft);
      if (result?.room) draft = result.room;
      if (draft) { draft.owner = owner; await write(parent, clean(draft)); }
      return result?.value;
    });
  }
  function pending(room, id) {
    const taken = new Set(room.deliveries.filter((d) => d.memberId === id && d.status !== 'retry').flatMap((d) => d.seqs));
    return room.messages.filter((m) => m.recipients.includes(id) && !taken.has(m.seq));
  }
  function addMessage(room, author, content, recipients, messageId, replyTo = '', deliveryId = '') {
    const prior = room.messages.find((m) => m.messageId === messageId);
    if (prior) {
      if (prior.content !== content || prior.authorMemberId !== author || prior.replyTo !== replyTo || JSON.stringify(prior.recipients) !== JSON.stringify(recipients)) throw new Error('同一消息 id 对应了不同内容或收件人。');
      return prior;
    }
    if (messageLimitReached(room)) throw new Error('本次议会已达到消息预算；可开启“不限次数”或开始新议题。');
    const message = { roomId: room.id, epoch: room.epoch, messageId, seq: room.messages.length + 1,
      authorMemberId: author, recipients, replyTo, content, kind: author === 'user' ? 'user' : 'speech', createdAt: now(), deliveryId };
    room.messages.push(message);
    return message;
  }
  function requireRunning(room) {
    if (!room || room.status !== 'running') throw new Error('议会已暂停或结束，不能继续发言。');
    if (now() >= room.deadlineAt) throw new Error('议会时间预算已用完。');
  }
  const service = {
    owner,
    snapshot: (parent) => roomView(read(parent), owner),
    flight: (parentId, memberId) => flights.get(keyOf(parentId, memberId)),
    async input(parent, members, text, messageId = randomUUID(), { fresh = false, recipients } = {}) {
      text = String(text ?? '').trim();
      if (!text || text.length > 8000) throw new Error('议题/补充消息须为 1–8000 字符。');
      if (members.length < 2) throw new Error('自由讨论至少需要两位已登记成员。');
      parents.set(parent.id, parent);
      return update(parent, (room) => {
        const prior = room?.messages.find((m) => m.messageId === messageId);
        if (prior) {
          if (prior.authorMemberId !== 'user' || prior.content !== text || (recipients && JSON.stringify([...new Set(recipients)].sort()) !== JSON.stringify(prior.recipients))) throw new Error('同一消息 id 对应了不同内容或收件人。');
          return { value: { roomId: room.id, messageId: prior.messageId, seq: prior.seq, status: room.status } };
        }
        if (typeof messageId !== 'string' || !messageId || messageId.length > 300) throw new Error('消息 id 无效。');
        if (fresh && [...flights.values()].some((f) => f.parentId === parent.id)) throw new Error('当前轮尚未结束，请稍后开始新议题。');
        if (!room || fresh) room = { id: randomUUID(), parentId: parent.id, epoch: randomUUID(), owner,
          protocol: 2, unlimited: false, topic: text, status: 'running', reason: '讨论要求已发布，等待主控结束准备且全员就绪。', startedAt: now(), deadlineAt: now() + config.roomTimeoutMs,
          limits: { maxMessages: config.maxRoomMessages, maxTurnsPerMember: config.maxMemberTurns, statementLimit: config.statementLimit },
          members: clean(members), messages: [], deliveries: [] };
        else if (room.status === 'idle') room.status = 'running';
        requireRunning(room);
        const target = recipients ?? room.members.map(memberKey);
        if (target.some((id) => !room.members.some((m) => memberKey(m) === id))) throw new Error('该收件人未加入本次议会。');
        const value = addMessage(room, 'user', text, [...new Set(target)].sort(), messageId);
        return { room, value: { roomId: room.id, messageId: value.messageId, seq: value.seq, status: room.status } };
      });
    },
    async control(parent, action, deliveryId, resolution) {
      parents.set(parent.id, parent);
      return update(parent, (room) => {
        if (!room) throw new Error('还没有自由讨论房间。');
        if (action === 'pause' || action === 'stop') {
          room.status = action === 'stop' ? 'stopped' : 'paused';
          room.reason = '已停止新派发；正在运行的成员会完成当前轮，后续发言不再转发。';
        } else if (action === 'resume') {
          if (room.deliveries.some((d) => d.status === 'uncertain')) throw new Error('存在未确认投递，请先核对成员记录并使用 room-resolve。');
          if (room.status === 'stopped' || messageLimitReached(room) || room.members.every((m) => turnLimitReached(room, memberKey(m)))) throw new Error('本次议会已结束或达到预算；达到次数预算时可开启“不限次数”后继续。');
          room.status = 'running'; room.reason = ''; room.deadlineAt = now() + config.roomTimeoutMs;
        } else if (action === 'unlimited') {
          if (!['on', 'off'].includes(deliveryId)) throw new Error('用法：/council unlimited on|off');
          if (room.status === 'stopped') throw new Error('本次议题已结束，请开始新议题后设置。');
          room.unlimited = deliveryId === 'on';
          if (!room.unlimited && ['running', 'idle'].includes(room.status) &&
            (messageLimitReached(room) || room.members.every((m) => turnLimitReached(room, memberKey(m))))) {
            room.status = 'paused'; room.reason = '已恢复次数限制，当前记录已达到预算；未派发消息保留。';
          } else if (!room.unlimited && room.reason === '次数限制已取消；点击“继续讨论”恢复派发。') {
            room.reason = '已恢复次数限制；当前议题仍暂停。';
          } else if (room.unlimited && room.status === 'paused' && /达到.*预算|^已恢复次数限制/u.test(room.reason)) {
            room.reason = '次数限制已取消；点击“继续讨论”恢复派发。';
          }
        } else if (action === 'resolve') {
          const d = room.deliveries.find((d) => d.id === deliveryId);
          if (!d || d.status !== 'uncertain' || !['received', 'retry'].includes(resolution)) throw new Error('只能核对未确认投递，选择 received 或 retry。');
          d.status = resolution === 'received' ? 'completed' : 'retry';
          d.error = '用户核对后处理';
        } else if (action !== 'status') throw new Error('未知房间操作。');
        return { value: { status: room.status, reason: room.reason, unlimited: room.unlimited === true, uncertain: room.deliveries.filter((d) => d.status === 'uncertain').map((d) => ({ id: d.id, memberId: d.memberId, seqs: d.seqs, executionId: d.executionId, runId: d.runId })) } };
      });
    },
    async post(identity, args, callId) {
      const { parent, roomId, memberId, deliveryId } = identity;
      return update(parent, (room) => {
        if (!room || room.id !== roomId) throw new Error('议会身份已过期。');
        const d = room.deliveries.find((d) => d.id === deliveryId && d.memberId === memberId);
        if (!d || !liveDelivery(d)) throw new Error('此成员本轮身份已结束。');
        if (room.protocol === 2 && d.readAt === undefined) throw new Error('请先调用 council_inbox 读取本轮原始消息。');
        const content = String(args.content ?? '').trim();
        if (!content || content.length > room.limits.statementLimit) throw new Error(`发言须为 1–${room.limits.statementLimit} 字符。`);
        const recipientKeys = args.to === 'all' || args.to === undefined ? room.members.map(memberKey) : String(args.to).split(/[,，]/u).map((s) => memberKey(resolveMember(room.members, s.trim())));
        const recipients = [...new Set(recipientKeys.filter((id) => id !== memberId))].sort();
        if (!recipients.length) throw new Error('收件人不能为空或只有自己。');
        const replyTo = args.reply_to || '';
        if (replyTo) {
          const replied = room.messages.find((m) => m.messageId === replyTo && visible(m, memberId));
          if (!replied) throw new Error('reply_to 不是你可见的房间消息。');
          const audience = new Set([...replied.recipients, replied.authorMemberId]);
          if (recipients.some((id) => !audience.has(id))) throw new Error('不能把定向消息的回复广播给原收件范围以外的成员。');
        }
        const messageId = `${room.id}:${memberId}:${callId}`;
        const duplicate = room.messages.some((m) => m.messageId === messageId);
        if (!duplicate) {
          requireRunning(room);
          if (d.yielded || room.messages.some((m) => m.deliveryId === deliveryId)) throw new Error('本轮已发言或让出发言；请结束当前回合。');
        }
        const value = addMessage(room, memberId, content, recipients, messageId, replyTo, deliveryId);
        return { value: { accepted: true, messageId: value.messageId, seq: value.seq, recipients: value.recipients } };
      });
    },
    async inbox(identity) {
      return update(identity.parent, (room) => {
        if (!room || room.id !== identity.roomId) throw new Error('议会身份已过期。');
        const d = room.deliveries.find((d) => d.id === identity.deliveryId && d.memberId === identity.memberId);
        if (!d || !liveDelivery(d)) throw new Error('此成员本轮身份已结束。');
        const initialized = room.deliveries.some((other) => other.id !== d.id && other.memberId === identity.memberId && other.readAt !== undefined);
        const previousRead = room.deliveries.findLast((other) => other.id !== d.id && other.memberId === identity.memberId && other.readAt !== undefined);
        const member = room.members.find((m) => memberKey(m) === identity.memberId);
        const messages = room.messages.filter((m) => d.seqs.includes(m.seq) && m.recipients.includes(identity.memberId));
        d.readAt ??= now();
        d.unlimited ??= room.unlimited === true;
        d.readMessageIds = messages.map((m) => m.messageId);
        return { value: { roomId: room.id, memberId: identity.memberId,
          ...initialized ? {} : { member: { name: member.name, role: member.roleName, description: member.rolePrompt || member.roleSummary || '' },
            members: room.members.map((m) => ({ id: memberKey(m), name: m.name, role: m.roleName })) },
          ...!initialized || (previousRead.unlimited === true) !== d.unlimited
            ? { limits: { ...room.limits, ...(d.unlimited ? { maxMessages: null, maxTurnsPerMember: null } : {}) } } : {},
          messages: messages.map(({ seq, messageId, authorMemberId, recipients, replyTo, content }) => ({ seq, messageId, authorMemberId, recipients, replyTo, content })) } };
      });
    },
    read(identity, after = 0, limit = 20) {
      const room = read(identity.parent);
      if (!room || room.id !== identity.roomId || !room.members.some((m) => memberKey(m) === identity.memberId)) throw new Error('议会身份已过期。');
      if (!Number.isInteger(after) || after < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('after_seq >= 0；limit 须在 1–50。');
      const messages = room.messages.filter((m) => m.seq > after && visible(m, identity.memberId)).slice(0, limit);
      return { roomId: room.id, status: roomView(room, owner).status, messages, next: messages.at(-1)?.seq ?? after };
    },
    async yield(identity, reason = '') {
      return update(identity.parent, (room) => {
        if (!room || room.id !== identity.roomId) throw new Error('议会身份已过期。');
        const d = room.deliveries.find((d) => d.id === identity.deliveryId && d.memberId === identity.memberId);
        if (!d || !liveDelivery(d)) throw new Error('此成员本轮身份已结束。');
        if (room.protocol === 2 && d.readAt === undefined) throw new Error('请先调用 council_inbox 读取本轮原始消息。');
        d.yielded = true; d.yieldReason = String(reason).slice(0, 300);
        return { value: { yielded: true, note: '本轮让出发言，不会广播此回执；有新消息时仍可再次唤醒。' } };
      });
    },
    async tick() {
      if (ticking || disposed) return;
      ticking = true;
      try {
        for (const parent of parents.values()) {
          let room = roomView(read(parent), owner);
          if (room?.status === 'stopped' && ![...flights.values()].some((f) => f.parentId === parent.id)) await release(parent.id);
          if (!room || room.status !== 'running') continue;
          if (room.protocol === 2 && room.openedAt === undefined) {
            if (parent.status === 'running') continue;
            try {
              const readiness = await Promise.all(room.members.map((m) => ready(parent, m)));
              if (!readiness.every(Boolean)) continue;
            } catch (error) {
              await update(parent, (r) => { r.status = 'paused'; r.reason = String(error?.message ?? error); });
              continue;
            }
            await update(parent, (r) => { if (r.status === 'running') { r.openedAt = now(); r.reason = ''; } });
            room = roomView(read(parent), owner);
            if (room.status !== 'running') continue;
          }
          if (now() >= room.deadlineAt || messageLimitReached(room)) {
            await update(parent, (r) => { r.status = 'paused'; r.reason = '已达到时间或消息预算；停止新派发。'; });
            continue;
          }
          for (const member of room.members) {
            const memberId = memberKey(member), key = keyOf(parent.id, memberId);
            if (flights.has(key)) continue;
            const deliveries = room.deliveries.filter((d) => d.memberId === memberId && d.status !== 'retry');
            if (deliveries.some((d) => liveDelivery(d) || d.status === 'uncertain') || turnLimitReached(room, memberId)) continue;
            const batch = pending(room, memberId);
            if (!batch.length) continue;
            try { if (!await ready(parent, member)) continue; }
            catch (error) {
              await update(parent, (r) => { r.status = 'paused'; r.reason = String(error?.message ?? error); });
              break;
            }
            const flight = { parentId: parent.id, memberId, roomId: room.id, deliveryId: randomUUID(), executionId: member.kind === 'subagent' ? member.sessionId : '', runId: '', controller: new AbortController() };
            flights.set(key, flight);
            try {
              const dispatch = await update(parent, (r) => {
                if (r.id !== flight.roomId || r.status !== 'running') return { value: null };
                // Recheck after readiness awaits: the user may have restored limits.
                if (messageLimitReached(r) || turnLimitReached(r, memberId) || now() >= r.deadlineAt) return { value: null };
                const messages = pending(r, memberId).slice(0, 8);
                if (!messages.length) return { value: null };
                r.deliveries.push({ id: flight.deliveryId, memberId, seqs: messages.map((m) => m.seq), status: 'sending',
                  executionId: flight.executionId, runId: '', createdAt: now(), error: '', yielded: false });
                return { value: { room: clean(r), prompt: roomPrompt(r, member, messages) } };
              });
              if (!dispatch) { flights.delete(key); continue; }
              const accepted = async (receipt = {}) => {
                Object.assign(flight, receipt);
                await update(parent, (r) => {
                  if (r.id !== flight.roomId) return;
                  const d = r.deliveries.find((d) => d.id === flight.deliveryId);
                  if (d) Object.assign(d, clean(receipt), { status: 'accepted' });
                });
              };
              void (async () => {
                try {
                  const result = await run({ parent, member, ...dispatch, flight, accepted, signal: flight.controller.signal });
                  const r = read(parent), d = r?.deliveries.find((d) => d.id === flight.deliveryId);
                  if (result.status === 'completed' && r?.id === flight.roomId && r.status === 'running' && r.protocol === 2 && (!d?.readMessageIds || (!d.yielded && !r.messages.some((m) => m.deliveryId === flight.deliveryId)))) {
                    result.status = 'failed'; result.error = '成员没有通过 council_inbox 读取消息并调用 post/yield；已暂停，正文不会冒充工具发言。';
                  }
                  if (r?.protocol !== 2 && result.status === 'completed' && result.text?.trim() && r?.id === flight.roomId && r.status === 'running' && !messageLimitReached(r) && now() < r.deadlineAt && !d?.yielded && !r.messages.some((m) => m.deliveryId === flight.deliveryId)) {
                    try {
                      const value = JSON.parse(result.text.trim());
                      if (value?.action === 'yield' && Object.keys(value).every((k) => ['action', 'reason'].includes(k))) await service.yield({ parent, ...flight }, value.reason);
                      else if (value?.action === 'post' && Object.keys(value).every((k) => ['action', 'to', 'content', 'reply_to'].includes(k))) await service.post({ parent, ...flight }, value, `final:${flight.deliveryId}`);
                      else throw new Error('最终回复不是有效的议会 post/yield 消息。');
                    } catch (error) {
                      result.status = 'failed'; result.error = `成员未通过工具或结构化出口发言：${String(error?.message ?? error)}`;
                    }
                  }
                  await update(parent, (r) => {
                    if (r.id !== flight.roomId) return;
                    const d = r.deliveries.find((d) => d.id === flight.deliveryId);
                    Object.assign(d, { status: result.status, error: result.error || '', finishedAt: now() });
                    if (result.status !== 'completed') { r.status = 'paused'; r.reason = `成员 ${member.name} ${result.status}，请核对后继续。`; }
                  });
                } catch (error) {
                  if (!disposed) await update(parent, (r) => {
                    if (r.id !== flight.roomId) return;
                    const d = r.deliveries.find((d) => d.id === flight.deliveryId);
                    if (d) Object.assign(d, { status: 'uncertain', error: String(error?.message ?? error), finishedAt: now() });
                    r.status = 'paused'; r.reason = '投递/运行状态未确认，已暂停，不会自动重发。';
                  }).catch(onError);
                } finally { flights.delete(key); }
              })();
            } catch (error) {
              flights.delete(key); onError(error);
              await update(parent, (r) => {
                r.status = 'paused'; r.reason = '持久化投递时发生错误，请核对后继续。';
                const d = r.deliveries.find((d) => d.id === flight.deliveryId);
                if (d) { d.status = 'uncertain'; d.error = String(error?.message ?? error); }
              }).catch(onError);
            }
          }
          room = read(parent);
          if (room?.status === 'running' && ![...flights.values()].some((f) => f.parentId === parent.id)) {
            const pendingMembers = room.members.filter((m) => pending(room, memberKey(m)).length);
            if (!pendingMembers.length) await update(parent, (r) => {
              if (r.status === 'running' && !r.members.some((m) => pending(r, memberKey(m)).length)) { r.status = 'idle'; r.reason = '所有成员已完成当前发言，消息队列为空。'; }
            });
            else if (pendingMembers.every((m) => turnLimitReached(room, memberKey(m)))) await update(parent, (r) => { r.status = 'paused'; r.reason = '成员唤醒次数达到预算；未派发消息保留。'; });
          }
        }
      } finally { ticking = false; }
    },
    dispose() {
      disposed = true; clearInterval(timer);
      for (const f of flights.values()) f.controller.abort(new Error('议会插件停止；投递状态须重新核对。'));
    },
  };
  // Created at plugin apply time, never from a CLI tool's AsyncLocalStorage scope.
  const timer = intervalMs > 0 ? setInterval(() => { void service.tick().catch(onError); }, intervalMs) : null;
  timer?.unref?.();
  return service;
}
