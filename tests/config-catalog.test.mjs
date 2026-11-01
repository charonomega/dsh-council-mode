import assert from 'node:assert/strict';
import test from 'node:test';
import { CLIS, CLI_IDS, ROLES, ROLE_BY_ID } from '../lib/catalog.js';
import { resolveConfig } from '../lib/config.js';

test('catalog ids are unique and complete', () => {
  assert.equal(new Set(CLI_IDS).size, CLI_IDS.length);
  assert.equal(new Set(ROLES.map((role) => role.id)).size, ROLES.length);
  for (const id of CLI_IDS) {
    assert.ok(CLIS[id], `missing CLI ${id}`);
    assert.ok(CLIS[id].label, `missing label ${id}`);
    assert.ok(CLIS[id].avatar, `missing avatar ${id}`);
  }
  assert.equal(ROLE_BY_ID.reviewer.readOnly, true);
  assert.equal(ROLE_BY_ID.engineer.readOnly, false);
});

test('config defaults and bounds', () => {
  const config = resolveConfig({});
  assert.equal(config.maxMembers, 6);
  assert.equal(config.maxRounds, 2);
  assert.throws(() => resolveConfig({ maxMembers: 1 }), /between 2 and 8/);
  assert.throws(() => resolveConfig({ unknown: 1 }), /unknown key/);
  assert.throws(() => resolveConfig({ maxMembers: '6' }), /integer/);
  assert.equal(resolveConfig({ maxMembers: 4 }).maxMembers, 4);
});
