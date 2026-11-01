export const RUNNING_MESSAGE_MODES = ['steer', 'interrupt', 'queue'];
export const RUNNING_MESSAGE_LABELS = {
    steer: '引导',
    interrupt: '插队',
    queue: '排队',
};
/** Only protocols with an implemented, acknowledged native steering channel. */
export const NATIVE_STEERING_TRANSPORTS = {
    codex: 'codex-app-v1',
    hermes: 'hermes-http-v1',
    pi: 'pi-rpc-v1',
    omp: 'omp-rpc-v1',
};
export const supportsNativeSteering = (cli) => !!NATIVE_STEERING_TRANSPORTS[cli];
/** Legacy Workers keep their original transport; an upgrade never changes their input protocol. */
export const supportsWorkerNativeSteering = (worker) => {
    const cli = worker.preference.cli ?? 'antigravity';
    return (cli === 'pi' ||
        cli === 'omp' ||
        (!!worker.transport && NATIVE_STEERING_TRANSPORTS[cli] === worker.transport));
};
export const defaultRunningMessageMode = (cli) => supportsNativeSteering(cli) ? 'steer' : 'queue';
//# sourceMappingURL=running-message.js.map