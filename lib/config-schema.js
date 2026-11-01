import Schema from '@deepseek-ai/schemastery';
import { COUNCIL_CONFIG_DEFAULTS, COUNCIL_CONFIG_LIMITS } from './config.js';

const descriptions = {
  maxMembers: '成员上限：每个议会可加入的成员数量（2–8）。',
  maxRoomMessages: '消息条数上限：每个新议题的消息总数，包含用户输入。议题内开启“不限次数”可取消此限制。',
  maxMemberTurns: '成员唤醒次数上限：每个成员在一个新议题中可被唤醒的次数。议题内开启“不限次数”可取消此限制。',
  roomTimeoutMs: '讨论时限（毫秒）：每次开始或继续议题后的最长派发时间；600000 为 10 分钟。“不限次数”不会取消此时限。',
  statementLimit: '单条发言长度上限（字符）：限制成员的每条议会发言。',
  roundTimeoutMs: '成员单轮超时（毫秒）：等待一次成员执行的最长时间；300000 为 5 分钟。',
  assignmentTimeoutMs: '执行任务超时（毫秒）：用户明确分配执行任务时的等待上限；900000 为 15 分钟。',
  maxRounds: '旧版讨论轮数上限：仅供旧版讨论流程使用，不限制当前自主议会。',
  maxDigestChars: '旧版摘要长度上限（字符）：仅供旧版讨论流程使用，当前自主议会不转发完整摘要。',
};

// DSH reads the exported Config schema to render the plugin configuration form.
// Defaults and bounds share the runtime validator's source of truth.
export const Config = Schema.object(Object.fromEntries(
  Object.entries(descriptions).map(([key, description]) => {
    const [min, max] = COUNCIL_CONFIG_LIMITS[key];
    return [key, Schema.natural().min(min).max(max)
      .default(COUNCIL_CONFIG_DEFAULTS[key]).description(description)];
  }),
)).description('议会模式配置。消息条数、唤醒次数和单条发言长度的新默认值从下一个议题生效；当前议题可单独切换“不限次数”。');
