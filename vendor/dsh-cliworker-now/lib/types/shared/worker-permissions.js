import { cliOf } from "./types.js";
/** Existing adapter modes only; DSH full-access/auto are not invented CLI modes. */
export function workerPermissionOptions(worker) {
    const cli = cliOf(worker.preference);
    const canPlan = cli !== 'hermes' && cli !== 'harness' && cli !== 'qoder' && cli !== 'qodercn' && (cli !== 'kimi' || worker.transport === 'kimi-acp-v1');
    return [
        ...(canPlan
            ? [
                {
                    value: 'plan',
                    name: '规划（只读）',
                    description: '使用此 CLI 的原生规划或只读模式；DSH 工具桥保持只读。',
                },
            ]
            : []),
        ...(cli !== 'harness'
            ? [
                {
                    value: 'accept-edits',
                    name: '允许编辑',
                    description: '沿用此 CLI 的原生保护，并受所属主会话的权限与审批约束。',
                },
            ]
            : []),
    ];
}
//# sourceMappingURL=worker-permissions.js.map