type Bounds = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
type Clip = Pick<CSSStyleDeclaration, 'overflowX' | 'overflowY'>;
/** A clipping ancestor needs release only when the native menu crosses it. */
export declare function clipsNativeJobMenu(menu: Bounds, ancestor: Bounds, clip: Clip): boolean;
/**
 * Install one plugin-owned compatibility lifetime. Closing Jobs, hiding the
 * Worker pane or disposing the plugin restores attributes and native CSS.
 * No React-owned node or host inline style is moved or rewritten.
 */
export declare function installNativeJobOverlay(doc: Document): () => void;
export {};
