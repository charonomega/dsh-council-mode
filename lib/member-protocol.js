/** Fixed invitation contract; role and topic are admitted only after enrollment. */
export const READY_PROMPT = '议会成员准备：仅回复“已就绪”。等待 council_inbox 通知后读取议题；现在不要讨论、检索、调用工具或执行任务。';
export const MEMBER_SKILL = 'dsh-council-member';
export const MEMBER_TOOLS = ['council_inbox', 'council_post', 'council_read', 'council_yield', 'skill'];

export function invitationIssue(execution) {
  if (['subagent', 'cliworker_start'].includes(execution.name) && execution.arguments?.prompt !== READY_PROMPT) {
    return `议会邀请阶段不能先行讨论。保留 CLI、模型、权限及名称参数，将 prompt 原样改为：${READY_PROMPT} 然后登记全部成员，把完整议题和结构化要求一次性发布到 council_convene。`;
  }
}
