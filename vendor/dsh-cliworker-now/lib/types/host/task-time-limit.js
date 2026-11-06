/** Bridge result errors for a reached limit (`native-time-limit.mjs`). */
export const BRIDGE_TIME_LIMIT_ERRORS = {
    total: 'Native task timed out',
    idle: 'Native task idle timed out',
};
export function taskTimeLimit(totalMs, idleMs, now = Date.now()) {
    return { deadlineAt: now + totalMs, totalMs, idleMs };
}
export const remainingMs = (limit, now = Date.now()) => Math.max(0, limit.deadlineAt - now);
function duration(ms) {
    if (ms % 3_600_000 === 0)
        return `${ms / 3_600_000} 小时`;
    if (ms % 60_000 === 0)
        return `${ms / 60_000} 分钟`;
    return `${Math.ceil(ms / 1000)} 秒`;
}
/** The stop reason names which limit ended the task. */
export function timeLimitMessage(kind, limit) {
    return kind === 'total'
        ? `任务超时：已达到总时限 ${duration(limit.totalMs)}`
        : `任务超时：连续 ${duration(limit.idleMs)}没有收到 CLI 事件（空闲时限）`;
}
/** A bridge run that ended on its own timer: its result error, or the error raised before any session. */
export function bridgeTimeLimit(error) {
    const text = error instanceof Error ? error.message : error;
    return Object.keys(BRIDGE_TIME_LIMIT_ERRORS).find((kind) => text === BRIDGE_TIME_LIMIT_ERRORS[kind]);
}
//# sourceMappingURL=task-time-limit.js.map