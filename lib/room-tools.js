import { defineTool } from './define-tool.js';

/** Identity comes exclusively from the live native activation / scoped CLI tool bridge. */
export function createRoomTools(rooms, host) {
  return {
    inbox: defineTool({ name: 'council_inbox',
      description: 'Read the original new messages in your current council delivery, with host-verified authors and recipients. No arguments; identity and unread sequence range come from your live execution. Use dsh-council-member skill. Read before post/yield; no history replay.',
      parameters: {},
      execute: async (_args, exec) => JSON.stringify(await rooms.inbox(await host.identify(exec.agent))),
    }),
    post: defineTool({ name: 'council_post',
      description: 'Publish one substantive speech directly to your autonomous council peers. to=all broadcasts; otherwise use comma-separated member ids/names. reply_to references a visible messageId. Author identity is supplied by the host. Do not relay through the chair. End the turn after posting.',
      parameters: { to: { type: 'string' }, content: { type: 'string', required: true }, reply_to: { type: 'string' } },
      execute: async (args, exec) => {
        if (!exec.callId) throw new Error('发言需要稳定的工具调用标识。');
        const result = await rooms.post(await host.identify(exec.agent), args, exec.callId);
        exec.concludeTurn?.();
        return JSON.stringify(result);
      },
    }),
    read: defineTool({ name: 'council_read',
      description: 'Read only room messages addressed to you or authored by you. after_seq is an exclusive sequence cursor; limit is 1–50. Does not wake peers or the chair.',
      parameters: { after_seq: { type: 'integer' }, limit: { type: 'integer' } },
      execute: async (args, exec) => JSON.stringify(rooms.read(await host.identify(exec.agent), args.after_seq ?? 0, args.limit ?? 20)),
    }),
    yield: defineTool({ name: 'council_yield',
      description: 'Yield this activation when you have no new contribution. The receipt is not broadcast. End the turn now; genuinely new peer messages may wake you later.',
      parameters: { reason: { type: 'string' } },
      execute: async (args, exec) => {
        const result = await rooms.yield(await host.identify(exec.agent), args.reason);
        exec.concludeTurn?.();
        return JSON.stringify(result);
      },
    }),
  };
}
