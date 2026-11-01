export function hermesCanonicalUsage(value) {
    if (!value)
        return;
    const result = { ...value };
    if (result.cacheRead === 0)
        delete result.cacheRead;
    if (result.cacheWrite === 0)
        delete result.cacheWrite;
    return result;
}
//# sourceMappingURL=hermes-canonical-usage.js.map