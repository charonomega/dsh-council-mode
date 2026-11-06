import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const councilOnlyPatch = "- insert:\n    - id: council-mode\n      name: '@local/dsh-council-mode'\n      config: {}\n";

const councilPeers = [
  '@deepseek-ai/cordis', '@deepseek-ai/dsh-agent', '@deepseek-ai/dsh-commands',
  '@deepseek-ai/dsh-llm', '@deepseek-ai/dsh-session', '@deepseek-ai/dsh-session-projection',
  '@deepseek-ai/dsh-system-prompt', '@deepseek-ai/dsh-tools', '@deepseek-ai/dsh-subagent',
];

export function councilOnlyManifest(manifest) {
  const result = structuredClone(manifest);
  result.description = 'Persistent Council Mode for an independently installed CLI Worker';
  result.dependencies = { '@deepseek-ai/schemastery': manifest.dependencies['@deepseek-ai/schemastery'] };
  result.peerDependencies = Object.fromEntries(councilPeers.map(name => [name, manifest.peerDependencies[name]]));
  result.peerDependencies['dsh-cliworker-now'] = '>=0.8.2 <0.9.0';
  result.peerDependenciesMeta = { 'dsh-cliworker-now': { optional: true } };
  result.files = manifest.files.filter(councilOnlyFile);
  delete result.scripts;
  return result;
}

export function councilOnlyFile(path) {
  return path !== 'vendor/dsh-cliworker-now' && !path.startsWith('vendor/')
    && path !== 'patches' && !path.startsWith('patches/')
    && path !== 'lib/cliworker-typert.js' && path !== 'scripts/verify-cliworker.mjs';
}

export function packageRelease(root, npmCli) {
  assert(npmCli, 'Run packaging through npm run pack:release so the npm CLI path is available.');
  const artifacts = resolve(root, 'artifacts');
  mkdirSync(artifacts, { recursive: true });
  function pack(directory, destination) {
    const run = spawnSync(process.execPath, [npmCli, 'pack', '--ignore-scripts', '--json', '--pack-destination', destination], {
      cwd: directory, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    });
    if (run.error) throw run.error;
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const results = JSON.parse(run.stdout);
    assert.equal(results.length, 1);
    return results[0];
  }

  const full = pack(root, artifacts);
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const stage = mkdtempSync(join(artifacts, 'council-only-'));
  let standalone;
  try {
    const directory = join(stage, 'package');
    for (const file of full.files.filter(file => councilOnlyFile(file.path))) {
      const target = join(directory, file.path);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, file.path), target);
    }
    writeFileSync(join(directory, 'package.json'), JSON.stringify(councilOnlyManifest(manifest), null, 2) + '\n');
    writeFileSync(join(directory, 'cordis.patch.yml'), councilOnlyPatch);
    standalone = pack(directory, stage);
    assert(standalone.files.every(file => councilOnlyFile(file.path)), 'Council-only package contains a bundled CLI resource.');
    const filename = `local-dsh-council-mode-${manifest.version}-council-only.tgz`;
    copyFileSync(join(stage, standalone.filename), join(artifacts, filename));
    standalone.filename = filename;
  } finally {
    assert.equal(dirname(resolve(stage)), artifacts, 'Staging cleanup escaped artifacts.');
    rmSync(stage, { recursive: true, force: true });
  }

  const cliDirectory = join(root, 'vendor/dsh-cliworker-now');
  const cliManifest = JSON.parse(readFileSync(join(cliDirectory, 'package.json'), 'utf8'));
  const cli = pack(cliDirectory, artifacts);
  const distributions = [
    { result: full, variant: 'bundled', manifest },
    { result: standalone, variant: 'council-only', manifest },
    { result: cli, variant: 'cliworker', manifest: cliManifest },
  ];
  const packages = distributions.map(({ result, variant, manifest: packageManifest }) => ({
    variant,
    filename: result.filename,
    version: packageManifest.version,
    dsh: packageManifest.engines.dsh,
    files: result.files.map(file => file.path),
    sha256: createHash('sha256').update(readFileSync(join(artifacts, result.filename))).digest('hex'),
  }));
  writeFileSync(join(artifacts, 'release-manifest.json'), JSON.stringify(packages, null, 2) + '\n');
  writeFileSync(join(artifacts, 'SHA256SUMS'), packages.map(item => `${item.sha256}  ${item.filename}\n`).join(''));
  return packages;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const packages = packageRelease(root, process.env.npm_execpath);
  console.log(JSON.stringify(packages.map(({ files, ...item }) => ({ ...item, files: files.length })), null, 2));
}
