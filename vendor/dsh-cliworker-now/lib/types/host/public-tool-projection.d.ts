import type { CliId, PublicToolCall } from '../shared/types.ts';
import type { EventInput } from './protocol.ts';
/** Keep only the public presentation contract, never arbitrary runner metadata. */
export declare function pickPublicToolCall(value: unknown): PublicToolCall | undefined;
/**
 * Read-only upgrade of documented legacy public tool shapes. Identity is taken
 * only from a native call ID; scheduling dependencies and step numbers are not
 * parent calls. Unknown detail remains available as the existing generic JSON.
 */
export declare function projectPublicToolCall(cli: CliId, event: EventInput): EventInput;
