/**
 * Recover the Harness page after a hot plugin switch crashed its React root.
 *
 * Enabling or disabling this plugin swaps the stock session/conversation/
 * subagent/chat UI for the bundled copies (or back). The Harness client
 * removes the old modules before it imports the new ones, so for a moment no
 * `session` scope adapter is installed; the root renderer wraps the whole page
 * in `ScopeProvider scope="session-maybe"`, throws `SlotAssemblyError`, and
 * every error boundary rethrows that error by design. React then empties
 * `#root` and the page stays white even after the new adapter arrives, while a
 * reload boots the same graph normally.
 *
 * At cold boot the Harness mounts React only after every client plugin has
 * activated, so a mounted-but-empty root seen by this plugin can only be a
 * crash from a live switch. Prefer restarting DSH's own web mount fiber after
 * module reconciliation settles. Its effect disposes the old React root before
 * mounting again, and DSH continues to own the replacement root's cleanup.
 *
 * DSH Desktop must not reload: its boot IPC answers every page load with the
 * module injections captured when the Host started (apps/desktop main.ts
 * `DESKTOP_IPC.boot`), so a reload after a live switch requests module
 * revisions that no longer exist and lands in the startup-failure dialog,
 * which offers to rewrite the profile. The page exposes no restart API, so
 * Desktop gets a plain-text notice only when in-place recovery is unavailable
 * or fails. Browsers retain the guarded reload as their fallback.
 * @module
 */
import type { Context } from '@deepseek-ai/cordis';
/** Minimum time between two automatic reloads of one tab. */
export declare const RELOAD_GAP_MS = 30000;
/** How long a check keeps looking after a live activation or disposal. */
export declare const ACTIVATION_WATCH_MS = 10000;
export declare const DISPOSAL_WATCH_MS = 60000;
type RootElement = {
    childElementCount: number;
};
type RemountDecision = 'waiting' | 'unavailable' | 'stopped' | {
    restart: () => Promise<void>;
};
/**
 * 只重启 DSH 自己拥有的 web mount fiber，不直接调用 uiRenderer.mount。
 * 依据 0.2.2-rc.1：web/src/mount.ts 的根级 inject + effect，以及 Cordis
 * Fiber.getEffects()/restart() 的公开接口。restart 等旧 disposer 完成才重挂；
 * 不改服务、配置、私有 effects 或 React 内部对象。标签/结构不匹配即回退。
 * 保存的是应用 root context，停用本插件后仍可使用；不在已销毁的插件上注册资源。
 */
export declare function hostRootRemount(ctx: Context): () => RemountDecision;
export interface RootRecoveryEnv {
    getRoot: () => RootElement | null;
    storage?: Pick<Storage, 'getItem' | 'setItem'>;
    reload: () => void;
    /** Inspect the host-owned mount and graph; never allocate an independent React root. */
    remount?: () => RemountDecision;
    /** Desktop: show the restart notice instead of reloading. */
    showNotice?: () => void;
    now: () => number;
    setTimeout: (callback: () => void, ms: number) => unknown;
    clearTimeout: (handle: unknown) => void;
    warn?: (message: string) => void;
}
/** React marks its container with `__reactContainer$<id>`; unmount sets it to null. */
export declare function mountedRoot(element: RootElement | null): boolean;
/** A root React mounted that now renders nothing: the uncaught-render-error state. */
export declare function crashedRoot(element: RootElement | null): boolean;
/**
 * Prefer the host-owned remount. If unavailable/unsuccessful, reload once in
 * browsers or show the Desktop restart notice. Never interrupt host teardown.
 * @returns whether remount succeeded or a reload/notice was requested.
 */
export declare function recoverCrashedRoot(env: RootRecoveryEnv): Promise<boolean>;
/**
 * Watch for a crashed root for a bounded time, then recover once it stays
 * crashed for {@link SETTLE_MS}. The watch ends by itself, on recovery or when
 * the returned stop function is called.
 */
export declare function watchCrashedRoot(env: RootRecoveryEnv, durationMs: number): () => void;
/**
 * Install the recovery for one activation of the plugin client.
 * - Live activation (root already mounted): watch briefly, since the swap that
 *   brought this client in may have crashed the page just before.
 * - Cold boot (root not mounted yet): nothing to recover.
 * - Disposal: keep a bounded watch running after this client is gone, because
 *   removing the bundled UI crashes the page the same way and the stock UI that
 *   comes back cannot recover it.
 * @returns the disposer for the plugin effect.
 */
export declare function installRootRecovery(env: RootRecoveryEnv | undefined): () => void;
/** True inside the DSH Desktop application window (its preload exposes the boot bridge). */
export declare function inDshDesktop(): boolean;
/** Fill a crashed root with plain text; React no longer owns any node in it. */
export declare function renderRestartNotice(root: Pick<HTMLElement, "append" | "ownerDocument">, text: string): void;
/**
 * The browser environment, or undefined outside a page (tests, server).
 * @param desktopNotice - text for the Desktop restart notice, resolved when it is shown.
 */
export declare function browserRootRecoveryEnv(desktopNotice: () => string, ctx?: Context): RootRecoveryEnv | undefined;
export {};
