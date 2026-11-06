import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { councilOnlyFile, councilOnlyManifest, councilOnlyPatch } from '../scripts/package-release.mjs';

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const bundledPatch = parse(readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8'));
const vendorPatch = parse(readFileSync(new URL('../vendor/dsh-cliworker-now/cordis.patch.yml', import.meta.url), 'utf8'));

test('both distributions are bound to the reviewed DSH runtime version', () => {
  const runtime = JSON.parse(readFileSync(new URL('../vendor/dsh-cliworker-now/runtime-host/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.engines.dsh, runtime.upstream.version);
  assert.equal(councilOnlyManifest(manifest).engines.dsh, manifest.engines.dsh);
  assert.equal(manifest.engines.dsh, '0.2.2-rc.1');
});

test('standalone CLI package declares its own distribution version and compatible DSH runtime', () => {
  const cli = JSON.parse(readFileSync(new URL('../vendor/dsh-cliworker-now/package.json', import.meta.url), 'utf8'));
  const inventory = JSON.parse(readFileSync(new URL('../patches/cliworker-distribution.json', import.meta.url), 'utf8'));
  assert.equal(cli.name, 'dsh-cliworker-now');
  assert.equal(cli.version, inventory.version);
  assert.equal(cli.version, '0.8.7-council.1');
  assert.notEqual(cli.version, manifest.version);
  assert.equal(cli.engines.dsh, manifest.engines.dsh);
});

test('bundled runtime uses upstream private UI IDs and preserves the stock settings rows', () => {
  const rows = bundledPatch.flatMap(patch => patch.insert ?? []);
  const upstreamRows = vendorPatch.flatMap(patch => patch.insert ?? []);
  for (const id of ['ui-session', 'ui-conversation', 'ui-subagent', 'ui-chat']) {
    const own = rows.find(row => row.id === `cliworker-${id}`);
    const upstream = upstreamRows.find(row => row.id === own?.id);
    assert(own && upstream);
    assert.equal(own.name, upstream.name.replace('./runtime-host/', './vendor/dsh-cliworker-now/runtime-host/'));
    assert.deepEqual(own.inject, upstream.inject);
    assert.equal(own.config, undefined);
    assert.equal(bundledPatch.find(patch => patch.id === id).disabled, true);
  }
  assert.deepEqual(rows.find(row => row.id === 'cliworker-now').inject, ['cliworkerNativeReady', 'cliworkerCouncilTypesReady']);
});

test('council-only distribution mounts only the council and requires an optional external CLI', () => {
  const standalone = councilOnlyManifest(manifest);
  assert.equal(standalone.name, manifest.name);
  assert.equal(standalone.version, manifest.version);
  assert.deepEqual(parse(councilOnlyPatch), [{ insert: [{ id: 'council-mode', name: manifest.name, config: {} }] }]);
  assert.equal(standalone.peerDependencies['dsh-cliworker-now'], '>=0.8.2 <0.9.0');
  assert.equal(standalone.peerDependenciesMeta['dsh-cliworker-now'].optional, true);
  assert.equal(standalone.dependencies['dsh-cliworker-now'], undefined);
  assert.deepEqual(Object.keys(standalone.dependencies), ['@deepseek-ai/schemastery']);
  assert.equal(manifest.peerDependenciesMeta, undefined);
});

test('council-only file selection omits UI overrides, vendored schemas and their verifier', () => {
  for (const path of [
    'vendor/dsh-cliworker-now', 'vendor/dsh-cliworker-now/lib/index.js',
    'vendor/dsh-cliworker-now/runtime-host/manifest.json', 'patches',
    'patches/cliworker-distribution.json', 'lib/cliworker-typert.js', 'scripts/verify-cliworker.mjs',
  ]) assert.equal(councilOnlyFile(path), false, path);
  for (const path of ['lib/adapter.js', 'index.js', 'client.js', 'skills/council/SKILL.md'])
    assert.equal(councilOnlyFile(path), true, path);
});
