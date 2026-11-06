import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { Button, StateDot, Switch } from '@deepseek-ai/dsh-client-ui-primitives';
import { LANGUAGE_PREFERENCES, MAX_CONCURRENT_LIMIT, MAX_TASK_TIME_LIMIT_MS, TASK_TIME_LIMIT_CHOICES, IDLE_TIME_LIMIT_CHOICES, } from "../shared/cli-settings.js";
import { BrandIcon } from "./icons.js";
import { NativeChoice } from "./native-settings-choice.js";
import { operationMessage } from "./operation-error.js";
import { value } from "./workers.js";
import { setLanguagePreference, t, useT } from "./i18n.js";
function readSettings(raw) {
    const next = JSON.parse(raw);
    const count = (input) => Number.isInteger(input) && input >= 1 && input <= MAX_CONCURRENT_LIMIT;
    // Absent fields are an older Host's defaults (`follow`, off, asking, 30 minutes, no idle limit); any other value is rejected.
    const language = next?.language ?? 'follow';
    const isolatedParallelWrites = next?.isolatedParallelWrites ?? false;
    const askBeforeDispatch = next?.askBeforeDispatch ?? true;
    const showDshSubagents = next?.showDshSubagents ?? true;
    const taskTimeLimitMs = next?.taskTimeLimitMs === undefined ? 1_800_000 : next.taskTimeLimitMs;
    const defaultTaskTimeLimitMs = next?.defaultTaskTimeLimitMs === undefined ? 1_800_000 : next.defaultTaskTimeLimitMs;
    const idleTimeLimitMs = next?.idleTimeLimitMs === undefined ? 0 : next.idleTimeLimitMs;
    const duration = (input, minimum) => Number.isInteger(input) && input >= minimum && input <= MAX_TASK_TIME_LIMIT_MS;
    if (!count(next?.maxConcurrent) ||
        !count(next?.defaultMaxConcurrent) ||
        !LANGUAGE_PREFERENCES.includes(language) ||
        typeof isolatedParallelWrites !== 'boolean' ||
        typeof askBeforeDispatch !== 'boolean' ||
        typeof showDshSubagents !== 'boolean' ||
        !duration(taskTimeLimitMs, 1000) ||
        !duration(defaultTaskTimeLimitMs, 1000) ||
        (idleTimeLimitMs !== 0 && !duration(idleTimeLimitMs, 60_000)))
        throw new Error(t('收到无效的通用设置，请重试'));
    return { ...next, language, isolatedParallelWrites, askBeforeDispatch, showDshSubagents, taskTimeLimitMs, defaultTaskTimeLimitMs, idleTimeLimitMs };
}
const SAVING = {
    language: '正在保存界面语言…',
    maxConcurrent: '正在保存同时对话数…',
    isolatedParallelWrites: '正在保存同目录写任务并行…',
    askBeforeDispatch: '正在保存调用前询问模型…',
    showDshSubagents: '正在保存 DSH 子 Agent 显示设置…',
    taskTimeLimitMs: '正在保存总时限…',
    idleTimeLimitMs: '正在保存空闲时限…',
};
const UNSAVED = {
    language: '界面语言未保存，请重新选择重试',
    maxConcurrent: '同时对话数未保存，请重新选择重试',
    isolatedParallelWrites: '同目录写任务并行未保存，请重试',
    askBeforeDispatch: '调用前询问模型未保存，请重试',
    showDshSubagents: 'DSH 子 Agent 显示设置未保存，请重试',
    taskTimeLimitMs: '总时限未保存，请重新选择重试',
    idleTimeLimitMs: '空闲时限未保存，请重新选择重试',
};
// Each language is named in itself, so the choice stays findable after a switch.
const LANGUAGE_LABELS = {
    follow: () => t('跟随 DSH'),
    zh: () => '中文',
    en: () => 'English',
};
/** Profile-wide plugin settings; each section owns its own save feedback. */
export function GeneralSettingsPane({ api, sessionId }) {
    const t = useT();
    const [settings, setSettings] = useState();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState();
    const [error, setError] = useState();
    const [attempt, retry] = useState(0);
    const languageHintId = useId();
    const hintId = useId();
    const isolationHintId = useId();
    const askHintId = useId();
    const taskTimeHintId = useId();
    const idleTimeHintId = useId();
    const request = useRef();
    const service = api.cliworker;
    useEffect(() => {
        const controller = new AbortController();
        request.current = controller;
        setLoading(true);
        setError(undefined);
        void (async () => {
            try {
                const next = readSettings(value(await service.generalSettings(sessionId, controller.signal)));
                if (controller.signal.aborted)
                    return;
                setSettings(next);
                setLanguagePreference(next.language);
            }
            catch (error) {
                if (!controller.signal.aborted)
                    setError({ message: operationMessage(error) });
            }
            finally {
                if (request.current === controller) {
                    request.current = undefined;
                    setLoading(false);
                }
            }
        })();
        return () => controller.abort();
    }, [service, sessionId, attempt]);
    async function save(field, next) {
        if (!settings || request.current || next === settings[field])
            return;
        const controller = new AbortController();
        request.current = controller;
        setSaving(field);
        setError(undefined);
        try {
            const updated = readSettings(value(await service.saveGeneralSettings(sessionId, JSON.stringify({ [field]: next }), controller.signal)));
            if (controller.signal.aborted)
                return;
            if (updated[field] !== next)
                throw new Error(t(UNSAVED[field]));
            setSettings(updated);
            // Switch the whole plugin at once; other windows follow through the Worker stream.
            if (field === 'language')
                setLanguagePreference(updated.language);
        }
        catch (error) {
            if (!controller.signal.aborted)
                setError({ field, message: operationMessage(error) });
        }
        finally {
            if (request.current === controller) {
                request.current = undefined;
                setSaving(undefined);
            }
        }
    }
    // A saved choice shows in its own control; only progress and failures get a line.
    const feedback = (field) => (saving === field || error?.field === field) && (_jsx("div", { className: "cwn-settings-save", children: _jsxs("span", { className: "cwn-settings-feedback-slot", role: "status", children: [saving === field && _jsx(StateDot, { state: "ongoing", size: 14 }), error?.field === field ? error.message : t(SAVING[field])] }) }));
    const progress = (_jsx("span", { className: "cwn-section-progress", role: "status", "aria-label": loading ? t('正在读取通用设置') : undefined, children: loading && _jsx(StateDot, { state: "ongoing", size: 14 }) }));
    const disabled = loading || !!saving || !settings;
    const placeholder = loading ? t('正在读取…') : undefined;
    const choices = Array.from({ length: MAX_CONCURRENT_LIMIT }, (_, index) => {
        const count = index + 1;
        return {
            id: String(count),
            label: count === settings?.defaultMaxConcurrent ? t('{count}（默认）', { count }) : String(count),
        };
    });
    const taskTimeLabel = (ms) => {
        if (ms === MAX_TASK_TIME_LIMIT_MS)
            return t('不限制（最长 24 小时）');
        if (ms % 3_600_000 === 0)
            return t('{count} 小时', { count: ms / 3_600_000 });
        if (ms % 60_000 === 0)
            return t('{count} 分钟', { count: ms / 60_000 });
        return t('{count} 秒', { count: Math.ceil(ms / 1000) });
    };
    const taskTimeChoices = [...new Set([
            ...TASK_TIME_LIMIT_CHOICES,
            ...(settings ? [settings.defaultTaskTimeLimitMs, settings.taskTimeLimitMs] : []),
        ])].sort((a, b) => a - b).map((ms) => ({
        id: String(ms),
        label: ms === settings?.defaultTaskTimeLimitMs ? t('{label}（默认）', { label: taskTimeLabel(ms) }) : taskTimeLabel(ms),
    }));
    const idleTimeChoices = [...new Set([
            ...IDLE_TIME_LIMIT_CHOICES,
            ...(settings ? [settings.idleTimeLimitMs] : []),
        ])].sort((a, b) => a - b).map((ms) => ({
        id: String(ms),
        // 「关闭」 already names the Close button, so the off choice has its own key.
        label: ms === 0 ? t('不启用') : t('{count} 分钟', { count: Math.ceil(ms / 60_000) }),
    }));
    return (_jsxs("div", { className: "cwn-settings-pane", "aria-label": t('CLI Worker 通用设置'), children: [_jsx("div", { className: "cwn-cli-identity", children: _jsxs("div", { className: "cwn-settings-cli-name", children: [_jsx(BrandIcon, { size: 40 }), _jsxs("div", { children: [_jsx("h2", { children: t('CLI Worker 设置') }), _jsx("p", { className: "cwn-cli-subtitle", children: t('适用于所有 CLI 与对话') })] })] }) }), _jsxs("section", { className: "cwn-settings-section", "aria-label": t('语言'), children: [_jsxs("div", { className: "cwn-settings-section-head", children: [_jsx("h3", { children: t('语言') }), _jsx("div", { className: "cwn-settings-section-tools", children: progress })] }), _jsxs("div", { className: "cwn-settings-form", children: [_jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('界面语言') }), _jsx("span", { className: "cwn-setting-description", id: languageHintId, children: t('跟随 DSH 时与 DeepSeek Harness 当前语言一致；只影响 CLI Worker 界面。') })] }), _jsx(NativeChoice, { label: t('界面语言'), describedBy: languageHintId, selected: settings?.language ?? '', placeholder: placeholder ?? t('选择语言'), choices: LANGUAGE_PREFERENCES.map((id) => ({ id, label: LANGUAGE_LABELS[id]() })), disabled: disabled, onChange: (language) => void save('language', language) })] }), feedback('language')] })] }), _jsxs("section", { className: "cwn-settings-section", "aria-label": t('任务调度'), children: [_jsx("div", { className: "cwn-settings-section-head", children: _jsx("h3", { children: t('任务调度') }) }), _jsxs("div", { className: "cwn-settings-form", children: [_jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('最高同时对话数') }), _jsx("span", { className: "cwn-setting-description", id: hintId, children: t('所有 CLI 共用；超出后新任务排队。调低不会中断进行中的任务。') })] }), _jsx(NativeChoice, { label: t('最高同时对话数'), describedBy: hintId, selected: settings ? String(settings.maxConcurrent) : '', placeholder: placeholder ?? t('选择数量'), choices: choices, disabled: disabled, onChange: (count) => void save('maxConcurrent', Number(count)) })] }), feedback('maxConcurrent'), _jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('同目录写任务并行') }), _jsx("span", { className: "cwn-setting-description", id: isolationHintId, children: t('在项目副本中同时运行，完成后由主 Agent 合并回项目') })] }), _jsx(Switch, { checked: settings?.isolatedParallelWrites ?? false, onChange: (enabled) => void save('isolatedParallelWrites', enabled), label: t('同目录写任务并行'), disabled: disabled })] }), feedback('isolatedParallelWrites'), _jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('调用前询问模型') }), _jsx("span", { className: "cwn-setting-description", id: askHintId, children: t('关闭后新对话直接使用项目的默认模型、强度与上次确认的角色；无有效设定时仍会询问') })] }), _jsx(Switch, { checked: settings?.askBeforeDispatch ?? true, onChange: (enabled) => void save('askBeforeDispatch', enabled), label: t('调用前询问模型'), disabled: disabled })] }), feedback('askBeforeDispatch'), _jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('在 CLI Worker 窗口显示 DSH 子 Agent') }), _jsx("span", { className: "cwn-setting-description", children: t('只影响此窗口的显示，不影响 DSH 子 Agent 的运行与原生入口') })] }), _jsx(Switch, { checked: settings?.showDshSubagents ?? true, onChange: (enabled) => void save('showDshSubagents', enabled), label: t('在 CLI Worker 窗口显示 DSH 子 Agent'), disabled: disabled })] }), feedback('showDshSubagents'), error && !error.field && (_jsxs("div", { className: "cwn-settings-save", children: [_jsx("span", { className: "cwn-settings-feedback-slot", role: "status", children: error.message }), !settings && (_jsx(Button, { type: "button", size: "sm", variant: "ghost", disabled: loading, onClick: () => retry((old) => old + 1), children: t('重试读取通用设置') }))] }))] })] }), _jsxs("section", { className: "cwn-settings-section", "aria-label": t('任务时限'), children: [_jsx("div", { className: "cwn-settings-section-head", children: _jsx("h3", { children: t('任务时限') }) }), _jsxs("div", { className: "cwn-settings-form", children: [_jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('总时限') }), _jsx("span", { className: "cwn-setting-description", id: taskTimeHintId, children: t('从任务开始计时，到时停止任务；修改只影响之后开始的任务') })] }), _jsx(NativeChoice, { label: t('总时限'), describedBy: taskTimeHintId, selected: settings ? String(settings.taskTimeLimitMs) : '', placeholder: placeholder ?? t('总时限'), choices: taskTimeChoices, disabled: disabled, onChange: (id) => void save('taskTimeLimitMs', Number(id)) })] }), feedback('taskTimeLimitMs'), _jsxs("div", { className: "cwn-setting-row", children: [_jsxs("span", { className: "cwn-setting-row-text", children: [_jsx("span", { children: t('空闲时限') }), _jsx("span", { className: "cwn-setting-description", id: idleTimeHintId, children: t('CLI 连续这段时间没有任何事件（回复、工具、思考）时停止任务') })] }), _jsx(NativeChoice, { label: t('空闲时限'), describedBy: idleTimeHintId, selected: settings ? String(settings.idleTimeLimitMs) : '', placeholder: placeholder ?? t('空闲时限'), choices: idleTimeChoices, disabled: disabled, onChange: (id) => void save('idleTimeLimitMs', Number(id)) })] }), feedback('idleTimeLimitMs')] })] })] }));
}
//# sourceMappingURL=general-settings.js.map