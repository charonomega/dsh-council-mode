import type { HarnessConversationRecord } from './harness-conversation-types.ts';
/** Non-secret associations only; never reuse a CLI session ID as a Harness ID. */
export declare class HarnessConversationStore {
    private readonly directory;
    private records;
    private readonly path;
    constructor(directory: string);
    list(): readonly HarnessConversationRecord[];
    remove(record: HarnessConversationRecord): void;
    save(record: HarnessConversationRecord): void;
    replace(previous: HarnessConversationRecord, replacement: HarnessConversationRecord): void;
    private commit;
}
