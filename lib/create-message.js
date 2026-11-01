/** Build a frozen user-role message without importing a Harness package. */

import { randomUUID } from 'node:crypto';

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

/**
 * Mirror dsh-llm's createUserMessage: clone, assign a fresh id, and freeze.
 * @param {{content: unknown[], source: unknown}} input
 */
export function createUserMessage(input) {
  return deepFreeze(
    structuredClone({
      ...input,
      role: 'user',
      id: randomUUID(),
    }),
  );
}
