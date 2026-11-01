import type { KeyboardEvent } from 'react';
/** The event fields read by the native composer, narrowed for textarea and behavior tests. */
export type ComposerKeyEvent = Pick<KeyboardEvent<HTMLTextAreaElement>, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'repeat' | 'getModifierState' | 'preventDefault'> & {
    nativeEvent: Pick<globalThis.KeyboardEvent, 'isComposing' | 'keyCode'>;
};
/**
 * Adapt Harness 0.2.0-rc.2's private ui-conversation input/editor/keymap to a
 * Worker textarea. The native InputBar's Lexical editor and submit transport
 * belong to the Harness session; this adapter forwards accepted gestures to
 * the caller's existing form submission instead.
 */
export declare function createComposerKeymap(canSubmit: () => boolean, submit: () => void, now?: () => number): {
    onCompositionStart(): void;
    onCompositionEnd(): void;
    onKeyDown(event: ComposerKeyEvent): void;
    /** Discard composition state when the addressed Worker changes. */
    reset(): void;
};
