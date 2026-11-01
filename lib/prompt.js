/** Model-facing council text builders. */

import { cliLabel, ROLE_BY_ID } from './catalog.js';
import { READY_PROMPT } from './member-protocol.js';

/** Stable system-prompt policy inserted only while the mode is active. */
export const COUNCIL_POLICY = `你处于自主议会模式。成员通过后台房间直接交流，不需要主控逐条转发消息。

1. 用户给出新议题时，先准备并登记用户要求的全部成员，再把议题、角色分工与结构化讨论要求完整写入 council_convene(message, new_room:true)。该消息先展示在房间，主控回合结束且全员就绪后才统一开场。不要让任何成员先准备立场或预先讨论。已有讨论的补充只传用户新增内容，不粘贴历史。
2. 默认不输出任何正文。council_convene 默认 silent=true，会静默结束主控回合。成员完成通知不是用户提问，直接结束，不调用转发工具。不要评价、计分、裁判。只有用户明确要求总结、审查、引导或向你提问时才发言；silent:false 仅用于用户明确要求你随后发言。
3. 用户可在议会面板专用输入框直接开始议题或发送补充，不调用主控模型。/council pause、resume、stop 控制后台调度。重启后先暂停；未确认投递只能由用户核对后通过 /council room-resolve <delivery-id> received|retry 处理，模型不得自行确认或重发。
4. 成员使用 council_inbox、council_post(to,content,reply_to)、council_read(after_seq,limit)、council_yield(reason)。不要转发成员回复，不要替成员发言，不使用 cliworker_followup/send_message 绕开后台队列。成员只讨论；执行工作仍需用户明确要求，再通过 council_assign 按权限派发。
5. 邀请成员按用户指定 CLI/角色调用 cliworker_start 或原生 subagent，然后 council_enroll。创建工具的 prompt 必须严格等于「${READY_PROMPT}」，不附加任何议题、观点、检索或开篇要求。名称和角色放在 description/agent_name 与 council_enroll 中。模型、强度、原生角色由创建流程询问，不要替用户选择。每位成员只创建一次；后续始终由后台复用同一会话读取收件箱。
6. 任何 DeepSeek 模型 → DSH 原生 subagent，再 council_enroll；不要用 CLI Worker 找 DeepSeek。GPT / Codex → cli=codex；Claude → claude；Kimi → kimi；GLM/ZCode → zcode；Grok → grok；MiMo → mimo；Gemini/Antigravity → antigravity；其余 CLI 按用户指定选择。
7. 不要用 pwsh、grep、glob、read 搜索 .codex/.dsh/安装配置推断模型可用性。信息不足时用 ask_user_question。不要递归派遣或绕过权限/审批。预算默认全房间 24 条消息、每成员 6 次唤醒、10 分钟，达到预算即停止新派发；用户可发起新议题。`;

function slice(text, limit) {
  const value = String(text ?? '');
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

/** Suggested names are unique per parent conversation; reuse the first free suffix. */
export function uniqueAgentName(base, taken = []) {
  const raw = String(base ?? '').trim();
  if (raw === '') return raw;
  const names = new Set(
    (Array.isArray(taken) ? taken : [])
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  );
  if (!names.has(raw)) return raw;
  const numbered = /^(.*?)-(\d+)$/u.exec(raw);
  const stem = numbered ? numbered[1] : raw;
  let suffix = numbered ? Math.max(2, Number(numbered[2]) + 1) : 2;
  for (let guard = 0; guard < 1000; guard += 1) {
    const candidate = `${stem}-${suffix}`;
    if (!names.has(candidate)) return candidate;
    suffix += 1;
  }
  return `${stem}-${Date.now()}`;
}

/** Build the host-generated invite request sent to DSH as a user message. */
export function buildInviteRequest({ cli, roleId, sessionTitle, agentName }) {
  const role = ROLE_BY_ID[roleId];
  const label = cliLabel(cli);
  const suggestedName = String(agentName ?? `${cli}-${roleId}`);
  const title = `${role.name} · ${slice(sessionTitle || '议会', 40)}`;
  const readOnly = role.readOnly && cli !== 'kimi';
  const readOnlyLine =
    cli === 'kimi'
      ? 'Kimi 的非交互模式不支持 read_only，不能保证只读；只读角色仅为提示词约定，council_assign 会拒绝未启用只读权限的只读任务。'
      : role.readOnly
        ? '请给 cliworker_start 传 read_only: true（该角色只读）。'
        : '该角色可写，不要传 read_only。';
  const prompt = READY_PROMPT;

  return `【议会邀请】请把 ${label} 加入议会。
议会角色：${role.name}（role_id="${role.id}"）— ${role.summary}

步骤：
1. 调用 cliworker_start：
   - cli: "${cli}"
   - title: "${title}"
   - prompt: "${prompt}"
   - agent_name: "${suggestedName}"
   ${readOnlyLine}
2. 等它返回 worker_id 与 agentName 后，立即调用 council_enroll：
   - worker_id: cliworker_start 返回的 worker_id
   - role_id: "${role.id}"
   - display_name: "${suggestedName}"

模型、思考强度和 CLI 原生角色由 CLI Worker 的问题卡片询问，不要替用户选择，也不要自行改 CLI。`;
}

/** One member's relay-only discussion prompt. */
export function buildDiscussionPrompt({
  topic,
  focus,
  round,
  rounds,
  member,
  role,
  prior,
  ownPrevious,
  marker,
}) {
  const lines = [
    `[council:${marker}]`,
    '议会群聊记录（按时间顺序）：',
    `用户/主持：${slice(topic, 1800)}`,
  ];
  for (const item of prior ?? []) {
    const value = String(item ?? '').trim();
    if (value !== '') lines.push(value);
  }
  lines.push('轮到你发言。请以你在议会中的身份直接回应上述记录，不要执行修改。');
  return lines.join('\n');
}

/**
 * One member's incremental relay prompt. Only messages this member has not
 * received are included; the member's own CLI/native session keeps the rest
 * of the discussion context.
 */
export function buildRelayPrompt({ entries, marker }) {
  const items = Array.isArray(entries) ? entries : [];
  const lines = [
    `[council:${marker}]`,
    items.length > 1
      ? `议会新增消息（按时间顺序，共 ${items.length} 条；只包含你尚未收到的内容）：`
      : '议会新增消息（只包含你尚未收到的内容）：',
  ];
  for (const entry of items) {
    lines.push(`#${entry.seq} ${entry.text}`);
    if (entry.authorId) lines.push(`来源：主持 ${entry.authorId}；消息 id：${entry.messageId}（转述内容不代表原作者已核验）`);
  }
  lines.push('轮到你发言。请以你在议会中的身份直接回应上述新增消息，不要执行修改。');
  return lines.join('\n');
}

/** Build the bounded digest returned to DSH after convening. */
export function buildConveneDigest({ topic, rounds, results, limit }) {
  const lines = [
    `议会转达完成（${results.filter((item) => item.ok).length}/${results.length} 位成员，${rounds} 轮）`,
    `议题：${topic}`,
    '成员发言：',
  ];
  for (const item of results) {
    const head = `- ${item.name}（${item.roleName}${item.cli ? ` · ${cliLabel(item.cli)}` : ''}）`;
    if (!item.ok) {
      lines.push(`${head}：未完成 — ${item.error}`);
      continue;
    }
    lines.push(`${head}：${slice(item.text, item.limit ?? 1200)}`);
    if (item.truncated) lines.push('  （发言已截断，完整内容见议会视图或成员会话）');
  }
  lines.push(
    '',
    '以上为本轮转达结果。除非用户明确要求总结/最终意见/审核/引导，否则不要自行输出最终意见；完整对话见议会房间。',
  );
  return slice(lines.join('\n'), limit);
}

/** One member's work order. */
export function buildAssignmentPrompt({ member, role, assignment, marker }) {
  const lines = [
    `[council:${marker}]`,
    '议会任务分配',
    `任务：${assignment.task}`,
  ];
  if (assignment.acceptance) lines.push(`交付物 / 验收标准：${assignment.acceptance}`);
  const writeScope = assignment.write_scope ?? assignment.writeScope;
  if (writeScope) lines.push(`约定写入范围（冲突检测和任务约定，不是路径沙箱）：${writeScope}`);
  else lines.push('这是只读任务：执行环境必须启用只读权限，不要修改任何文件。');
  lines.push(
    `你的议会角色：${role.name}（${role.id}）— ${role.summary}`,
    `角色要求：${role.prompt}`,
    '请先读必要上下文再动手；完成后用三行以内汇报：改了什么 / 怎么验证 / 还有什么风险。不要超出允许的写入范围。',
  );
  return lines.join('\n');
}

/** Build the bounded report returned to DSH after assignments. */
export function buildAssignmentReport({ results, limit }) {
  const lines = ['议会任务执行结果：'];
  for (const item of results) {
    const head = `- ${item.name}（${item.roleName}${item.cli ? ` · ${cliLabel(item.cli)}` : ''}）— ${item.task}`;
    if (!item.ok) {
      const label = item.status === 'uncertain' ? '状态未确认' : item.status === 'cancelled' ? '已取消' : '失败';
      lines.push(`${head}：${label} — ${item.error}`);
      continue;
    }
    lines.push(`${head}：${item.status === 'completed' ? '完成' : '已接受，待验证完成'}`);
    if (item.text) lines.push(slice(item.text, item.limit ?? 1600));
    if (item.truncated) lines.push('  （结果已截断，完整内容见成员会话）');
  }
  lines.push('', '请向群汇报结果；失败项如实说明，不要自动换 CLI 或重试。');
  return slice(lines.join('\n'), limit);
}

/** Remove the final-opinion prefix used by the client badge. */
export function stripFinalOpinionPrefix(text) {
  return String(text ?? '').replace(/^\s*【最终意见】\s*/u, '');
}
