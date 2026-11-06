import { t } from "./i18n.js";
import { hostText } from "./operation-error.js";
const reasons = {
    goal: '当前 CLI 不支持目标',
    plan: '当前 CLI 不支持规划模式',
    feedback: '当前 CLI 不支持反馈',
    fork: '当前 CLI 不支持会话分支',
    forkEarlier: '当前 CLI 只支持从最新一轮分支',
};
export function harnessFeatureReason(binding, feature) {
    return binding.capabilities[feature]
        ? undefined
        : hostText(binding.reasons?.[feature]) || t(reasons[feature] ?? '当前 CLI 不支持此功能');
}
//# sourceMappingURL=harness-feature-support.js.map