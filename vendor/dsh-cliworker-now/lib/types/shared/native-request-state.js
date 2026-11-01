export function telemetryAvailability(busy, disconnected = false) {
    const metric = disconnected
        ? { state: 'unavailable', reason: 'disconnected' }
        : busy ? { state: 'pending', reason: 'awaiting-data' }
            : { state: 'unavailable', reason: 'not-reported' };
    return { statistics: { ...metric }, tokenUsage: { ...metric }, context: { ...metric } };
}
//# sourceMappingURL=native-request-state.js.map