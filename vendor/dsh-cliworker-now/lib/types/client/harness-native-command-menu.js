import { DshNativeComposer, useDshConversation } from "./dsh-subagents.js";
import { createElement, useSyncExternalStore } from 'react';
import { HARNESS_COMMAND_SOURCE } from "./harness-native-commands.js";
import { shadowHarnessSlot } from "./harness-slot-shadow.js";
/** All native Conversation occurrences share this public composer seat.
 * The shipped runtime's commandSource owner prop selects the existing menu
 * controller; ordinary Sessions keep their original source and injection. */
export function installHarnessNativeCommandMenu(ctx, bindings) {
    return shadowHarnessSlot(ctx.slots, 'conversation.composer.bar', undefined, (original) => {
        const Native = original.component;
        function CommandMenu(props) {
            const dsh = useDshConversation(props.sessionId);
            const binding = useSyncExternalStore(bindings.subscribe, () => props.sessionId ? bindings.get(props.sessionId) : undefined);
            if (dsh)
                return createElement(DshNativeComposer, { Native, nativeProps: props, context: dsh });
            return createElement(Native, binding?.workerId
                ? { ...props, commandSource: HARNESS_COMMAND_SOURCE }
                : props);
        }
        return { component: CommandMenu, inject: original.inject };
    });
}
//# sourceMappingURL=harness-native-command-menu.js.map