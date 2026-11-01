/** Static CLI and council-role catalogs shared by the host and the client build. */

/** Canonical active CLI ids, in display order. */
export const CLI_IDS = [
  'codex',
  'claude',
  'kimi',
  'zcode',
  'grok',
  'qoder',
  'qodercn',
  'pi',
  'omp',
  'opencode',
  'mimo',
  'hermes',
  'antigravity',
];

/**
 * CLI display data. `avatar` is used on light surfaces, `avatarDark` on dark
 * surfaces; both are keys into the generated avatar data module.
 */
export const CLIS = {
  codex: { id: 'codex', label: 'Codex', short: 'Cx', color: '#4D6BFE', avatar: 'codex' },
  claude: { id: 'claude', label: 'Claude Code', short: 'Cl', color: '#D97757', avatar: 'claude' },
  kimi: {
    id: 'kimi',
    label: 'Kimi Code',
    short: 'K',
    color: '#2F6BFF',
    avatar: 'kimi-light',
    avatarDark: 'kimi-dark',
  },
  zcode: { id: 'zcode', label: 'ZCode', short: 'Z', color: '#7C5CFF', avatar: 'zcode' },
  grok: { id: 'grok', label: 'Grok Build', short: 'G', color: '#111111', avatar: 'grok' },
  qoder: { id: 'qoder', label: 'Qoder', short: 'Q', color: '#2F6BFF', avatar: 'qoder' },
  qodercn: { id: 'qodercn', label: 'Qoder CN', short: 'Q', color: '#2F6BFF', avatar: 'qoder' },
  pi: { id: 'pi', label: 'Pi', short: 'π', color: '#16A085', avatar: 'pi' },
  omp: { id: 'omp', label: 'Oh My Pi', short: 'O', color: '#F97316', avatar: 'omp' },
  opencode: { id: 'opencode', label: 'OpenCode', short: 'OC', color: '#14B8A6', avatar: 'opencode' },
  mimo: { id: 'mimo', label: 'MiMo Code', short: 'M', color: '#FF6900', avatar: 'mimo' },
  hermes: { id: 'hermes', label: 'Hermes Agent', short: 'H', color: '#C9A227', avatar: 'hermes' },
  antigravity: {
    id: 'antigravity',
    label: 'Antigravity',
    short: 'A',
    color: '#4285F4',
    avatar: 'antigravity',
  },
};

/** Council roles. `readOnly` recommends starting the member in CLI plan mode. */
export const ROLES = [
  {
    id: 'engineer',
    name: '代码工程师',
    summary: '实现、修复、重构；对代码与运行结果负责。',
    prompt:
      '你是议会的代码工程师。你负责把决定落实为可运行的代码：先读相关代码，再做最小、可验证的改动；说明你改了哪些文件、如何验证、还有什么风险。不要修改任务写入范围之外的文件。',
    readOnly: false,
    tag: '工程',
  },
  {
    id: 'reviewer',
    name: '代码审查员',
    summary: '只读审查代码，找缺陷、回归与安全风险。',
    prompt:
      '你是议会的代码审查员。你只读代码与运行只读命令，不修改任何文件。按严重程度报告具体缺陷、触发条件、证据与修复建议；先报阻断问题，再报次要问题。',
    readOnly: true,
    tag: '审查',
  },
  {
    id: 'tester',
    name: '测试工程师',
    summary: '设计用例、复现缺陷、验证修复；只写测试相关文件。',
    prompt:
      '你是议会的测试工程师。你负责把需求转成可执行的验收用例，复现问题并验证修复。你只能写测试文件或临时验证脚本，不修改产品代码；报告用例、实际结果与未覆盖的风险。',
    readOnly: false,
    tag: '测试',
  },
  {
    id: 'researcher',
    name: '研究员',
    summary: '检索、比对、求证，给出带来源的结论。',
    prompt:
      '你是议会的研究员。你负责检索资料、核对事实、比较不同说法，并给出带来源链接的结论。区分事实、推断与未知；不要编造来源。你只做只读调查，不修改工作区。',
    readOnly: true,
    tag: '研究',
  },
  {
    id: 'analyst',
    name: '数据分析师',
    summary: '读数据、算指标、解释结果；不做破坏性改动。',
    prompt:
      '你是议会的数据分析师。你负责读取数据、复算指标、解释异常，并说明口径、样本与不确定性。只做只读分析，不修改业务文件；需要脚本时放在临时目录并说明。',
    readOnly: true,
    tag: '分析',
  },
  {
    id: 'writer',
    name: '文档编辑',
    summary: '把结论写成清晰、可交付的文档。',
    prompt:
      '你是议会的文档编辑。你负责把讨论结论写成结构清晰、可交付的文档，保留关键事实、决定与未决问题。只修改文档类文件，不改产品代码；完成后报告文件路径与变更要点。',
    readOnly: false,
    tag: '文档',
  },
  {
    id: 'product',
    name: '产品/需求',
    summary: '澄清目标、边界、验收标准与取舍。',
    prompt:
      '你是议会的产品/需求角色。你负责澄清目标用户、范围、优先级、验收标准与取舍；主动指出需求中的矛盾与未决问题。你只做只读分析，不修改代码或文档。',
    readOnly: true,
    tag: '产品',
  },
  {
    id: 'critic',
    name: '反方/风险官',
    summary: '挑战假设、找失败模式与反例。',
    prompt:
      '你是议会的反方/风险官。你的职责是挑战主流方案：找隐藏假设、失败模式、反例、成本与合规风险，并给出可执行的替代方案或缓解措施。你只做只读分析，不修改工作区。',
    readOnly: true,
    tag: '风险',
  },
];

/** @type {Record<string, (typeof ROLES)[number]>} */
export const ROLE_BY_ID = Object.fromEntries(ROLES.map((role) => [role.id, role]));

/** @type {Record<string, (typeof CLIS)[keyof typeof CLIS]>} */
export const CLI_BY_ID = CLIS;

/** Display label for a CLI id, tolerating missing/legacy ids. */
export function cliLabel(id) {
  return CLIS[id]?.label ?? String(id ?? 'CLI');
}

/** Display label for a role id, tolerating missing/legacy ids. */
export function roleLabel(id) {
  return ROLE_BY_ID[id]?.name ?? String(id ?? '成员');
}

/** Default display name for a newly invited member. */
export function defaultMemberName(cli, roleId) {
  const stem = CLIS[cli]?.short?.toLowerCase?.() ?? String(cli ?? 'member');
  return `${stem}-${roleId}`.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Human-readable list of role ids for errors. */
export const ROLE_IDS_TEXT = ROLES.map((role) => role.id).join(', ');
