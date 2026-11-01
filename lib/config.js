/** Validated plugin configuration. */

const DEFAULTS = Object.freeze({
  maxMembers: 6,
  maxRounds: 2,
  statementLimit: 1200,
  roundTimeoutMs: 300_000,
  assignmentTimeoutMs: 900_000,
  maxDigestChars: 16_000,
  maxRoomMessages: 24,
  maxMemberTurns: 6,
  roomTimeoutMs: 600_000,
});

const LIMITS = Object.freeze({
  maxMembers: [2, 8],
  maxRounds: [1, 3],
  statementLimit: [200, 4000],
  roundTimeoutMs: [30_000, 900_000],
  assignmentTimeoutMs: [60_000, 3_600_000],
  maxDigestChars: [4000, 30_000],
  maxRoomMessages: [4, 100],
  maxMemberTurns: [1, 20],
  roomTimeoutMs: [30_000, 3_600_000],
});

/**
 * Merge the raw row config with defaults and reject unknown or out-of-range values.
 * @param {Record<string, unknown>} raw
 */
export function resolveConfig(raw = {}) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('council-mode config must be an object');
  }
  const unknown = Object.keys(raw).filter((key) => !(key in DEFAULTS));
  if (unknown.length > 0) {
    throw new Error(`council-mode config has unknown key(s): ${unknown.join(', ')}`);
  }
  const config = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (raw[key] === undefined) continue;
    const value = raw[key];
    if (!Number.isInteger(value)) {
      throw new Error(`council-mode config "${key}" must be an integer`);
    }
    const [min, max] = LIMITS[key];
    if (value < min || value > max) {
      throw new Error(`council-mode config "${key}" must be between ${min} and ${max}`);
    }
    config[key] = value;
  }
  return Object.freeze(config);
}

export { DEFAULTS as COUNCIL_CONFIG_DEFAULTS, LIMITS as COUNCIL_CONFIG_LIMITS };
