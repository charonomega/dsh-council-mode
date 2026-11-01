import assert from 'node:assert/strict';
import test from 'node:test';
import Schema from '@deepseek-ai/schemastery';
import { Config } from '../lib/config-schema.js';
import { COUNCIL_CONFIG_DEFAULTS, COUNCIL_CONFIG_LIMITS, resolveConfig } from '../lib/config.js';

test('plugin form defaults match runtime defaults and preserve valid overrides', () => {
  assert.deepEqual(Config({}), resolveConfig({}));
  const input = { maxMembers: 4, maxRoomMessages: 48, maxMemberTurns: 12, roomTimeoutMs: 1200000 };
  assert.deepEqual(Config(input), resolveConfig(input));
});

test('plugin form rejects invalid counts and timeouts at the same boundaries as runtime', () => {
  for (const [key, [min, max]] of Object.entries(COUNCIL_CONFIG_LIMITS)) {
    for (const value of [min, max]) {
      assert.equal(Config({ [key]: value })[key], resolveConfig({ [key]: value })[key]);
    }
    for (const value of [min - 1, max + 1, min + 0.5, String(min)]) {
      assert.throws(() => Config({ [key]: value }), `${key} form accepts ${value}`);
      assert.throws(() => resolveConfig({ [key]: value }), `${key} runtime accepts ${value}`);
    }
  }
});

test('plugin form serializes descriptions, defaults and numeric limits for DSH', () => {
  const json = new Schema(JSON.parse(JSON.stringify(Config)));
  assert.equal(json.type, 'object');
  assert.deepEqual(Object.keys(json.dict).sort(), Object.keys(COUNCIL_CONFIG_DEFAULTS).sort());
  for (const [key, field] of Object.entries(json.dict)) {
    assert.equal(field.type, 'number');
    assert.equal(field.meta.step, 1);
    assert.equal(field.meta.default, COUNCIL_CONFIG_DEFAULTS[key]);
    assert.equal(field.meta.min, COUNCIL_CONFIG_LIMITS[key][0]);
    assert.equal(field.meta.max, COUNCIL_CONFIG_LIMITS[key][1]);
    assert.equal(typeof field.meta.description, 'string');
    assert.ok(field.meta.description.length > 0);
  }
});
