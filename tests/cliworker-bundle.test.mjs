import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

// The DSH protocol runtime is supplied by the host, not installed for unit
// tests. Replace only that host boundary; load the shipped generated manifest
// and all its real Zod schemas. Real RPC registration is verified in DSH.
const protocolStub = 'data:text/javascript,' + encodeURIComponent('export const createTypertRemoteInfo = info => ({ descriptors: Object.entries(info.methods).map(([id, method]) => ({ id, ...method })) });');
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@deepseek-ai/dsh-typert-protocol/remote-info') return { url: protocolStub, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
const { apply, readyService } = await import('../lib/cliworker-typert.js');
hooks.deregister();

function context(existing, fail) {
  const state = { contribution: existing, services: new Map(), disposed: 0, registrations: 0 };
  const effects = [];
  return {
    state,
    dispose() { for (const effect of effects.splice(0).reverse()) effect(); },
    ctx: {
      typert: {
        getPackage() { return state.contribution; },
        register(contribution) {
          state.registrations++;
          if (fail) throw fail;
          state.contribution = contribution;
          return () => { state.contribution = undefined; state.disposed++; };
        },
      },
      effect(callback) { effects.push(callback()); },
      provide(name, value) { state.services.set(name, value); },
    },
  };
}

test('bundled CLI protocol retains original wire names and withdraws on unmount', () => {
  const host = context();
  apply(host.ctx);
  const manifest = host.state.contribution;
  assert.equal(manifest.package, 'dsh-cliworker-now');
  assert.equal(manifest.face, 'host');
  const watch = manifest.invocations.find(method => method.id === 'cliworker/watch');
  const submit = manifest.invocations.find(method => method.id === 'cliworker/submitMessage');
  assert.equal(watch.result.typeSymbol, 'dsh-cliworker-now#cliworker/watch:result');
  assert.equal(watch.result.create().parse('snapshot'), 'snapshot');
  assert(submit.parameters.some(parameter => parameter.codec.typeSymbol === 'dsh-cliworker-now#cliworker/submitMessage:requestJSON'));
  assert.equal(host.state.services.get(readyService).package, manifest.package);
  host.dispose();
  assert.equal(host.state.contribution, undefined);
  assert.equal(host.state.disposed, 1);
});

test('bundled CLI refuses a preexisting protocol instead of borrowing a stale standalone version', () => {
  const existing = { package: 'dsh-cliworker-now', face: 'host' }, host = context(existing);
  assert.throws(() => apply(host.ctx), /停用或卸载独立 CLI Worker/);
  assert.equal(host.state.contribution, existing);
  assert.equal(host.state.registrations, 0);
  assert.equal(host.state.services.size, 0);
});

test('failed protocol registration does not release the CLI readiness gate', () => {
  const failure = new Error('invalid protocol'), host = context(undefined, failure);
  assert.throws(() => apply(host.ctx), error => error === failure);
  assert.equal(host.state.services.size, 0);
});
