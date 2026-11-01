import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { active, effortLabel, isUserInterrupted, workerName, } from "../shared/types.js";
import { displayModelName } from "../shared/model-presentation.js";
import { Glyph } from "./icons.js";
import { NameCopy } from "./name-copy.js";
const status = {
    queued: '排队中',
    running: '运行中',
    stopping: '正在停止',
    completed: '已完成',
    failed: '失败',
    uncertain: '结果待核实',
    interrupted: '已中断',
};
export function WorkerCard({ worker, collapsed, unavailable, busy, onOpen, onManage, }) {
    const [menu, setMenu] = useState(false);
    const point = useRef();
    const card = useRef(null);
    const openButton = useRef(null);
    useEffect(() => {
        if (collapsed)
            setMenu(false);
    }, [collapsed]);
    const locked = collapsed || unavailable || busy;
    const openMenu = (x, y) => {
        if (collapsed)
            return;
        point.current = x === undefined || y === undefined ? undefined : { x, y };
        setMenu(true);
    };
    const entries = [
        { id: 'open', label: '打开对话', disabled: collapsed },
        { id: 'title', label: '修改聊天标题', disabled: locked },
        { id: 'name', label: '修改智能体名称', disabled: locked },
        { type: 'separator', id: 'separator' },
        { id: 'delete', label: '删除', disabled: locked || active(worker.status), danger: true },
    ];
    return (_jsx("div", { ref: card, className: "cwn-worker", "data-worker-id": worker.id, onClick: (event) => {
            // The native menu portal still bubbles through this React owner. Only
            // bare card/text areas open; every actual button owns its own action.
            if (event.target.closest?.('button,[role="menu"]'))
                return;
            if (!collapsed)
                onOpen();
        }, onContextMenu: (event) => {
            if (collapsed)
                return;
            event.preventDefault();
            event.stopPropagation();
            openMenu(event.clientX, event.clientY);
        }, children: _jsx(Menu, { open: menu, portal: true, autoFocus: true, className: "cwn-worker-menu-anchor", listClassName: "cwn-worker-menu", getAnchorRect: () => {
                if (point.current)
                    return new DOMRect(point.current.x, point.current.y, 0, 0);
                return card.current?.getBoundingClientRect() ?? openButton.current?.getBoundingClientRect() ?? null;
            }, onClose: () => setMenu(false), items: entries, onSelect: (id) => {
                setMenu(false);
                if (id === 'open')
                    onOpen();
                else if (id === 'title' || id === 'name' || id === 'delete')
                    onManage(id);
            }, anchor: _jsxs("div", { className: "cwn-worker-layout", children: [_jsx("button", { ref: openButton, type: "button", className: "cwn-worker-open", "data-open-worker-id": worker.id, "aria-haspopup": "menu", "aria-expanded": menu, "aria-keyshortcuts": "Shift+F10", tabIndex: collapsed ? -1 : undefined, onClick: () => {
                            if (!collapsed)
                                onOpen();
                        }, onKeyDown: (event) => {
                            if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
                                if (collapsed)
                                    return;
                                event.preventDefault();
                                event.stopPropagation();
                                openMenu();
                            }
                        }, children: _jsxs("span", { className: "cwn-worker-line", children: [_jsx("span", { className: "cwn-worker-title", children: worker.title }), _jsxs("span", { className: `cwn-worker-status ${worker.status}`, children: [_jsx("span", { className: `cwn-dot ${worker.status}` }), isUserInterrupted(worker) ? '已停止' : status[worker.status]] })] }) }), _jsxs("div", { className: "cwn-worker-meta", children: [_jsx(NameCopy, { name: workerName(worker), disabled: collapsed }), _jsx("span", { className: "cwn-meta-divider cwn-name-divider", "aria-hidden": "true" }), _jsx("span", { className: "cwn-worker-model", title: displayModelName(worker.preference), children: displayModelName(worker.preference) }), _jsx("span", { className: "cwn-meta-divider", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { children: effortLabel(worker.preference.effort) })] }), _jsx("span", { className: "cwn-worker-chevron", "aria-hidden": "true", children: _jsx(Glyph, { name: "chevron" }) })] }) }) }));
}
//# sourceMappingURL=worker-card.js.map