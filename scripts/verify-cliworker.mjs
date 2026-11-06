import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { verifyHostRuntime } from '../vendor/dsh-cliworker-now/lib/native-runtime-guard/host-runtime.mjs';

const root = fileURLToPath(new URL('../vendor/dsh-cliworker-now/', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('../patches/cliworker-distribution.json', import.meta.url), 'utf8'));
const council = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const cli = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    assert(!entry.isSymbolicLink(), `Unexpected symlink: ${entry.name}`);
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [relative(root, path).replaceAll('\\', '/')];
  }).sort();
}
assert.deepEqual(files(root), Object.keys(manifest.files).sort(), 'CLI Worker package inventory changed');
for (const [path, hash] of Object.entries(manifest.files)) {
  assert.equal(createHash('sha256').update(readFileSync(join(root, path))).digest('hex'), hash, path);
}
const runtime = verifyHostRuntime(root);
assert.equal(cli.version, manifest.version, 'CLI distribution version differs from the inventory');
assert.equal(council.engines.dsh, runtime.upstream.version, 'Bundled UI must target the declared DSH runtime');
assert.equal(cli.engines.dsh, council.engines.dsh, 'Standalone CLI and Council runtime constraints differ');
console.log(`CLI Worker ${manifest.version}: ${Object.keys(manifest.files).length} files verified; ${runtime.packages.length} native UI modules verified.`);
