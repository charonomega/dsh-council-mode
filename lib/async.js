/** Bound even an adapter which forgets to observe its AbortSignal. */
export function abortable(value, signal) {
  if (!signal) return Promise.resolve(value);
  return new Promise((resolve, reject) => {
    const abort = () => { cleanup(); reject(signal.reason ?? new Error('aborted')); };
    const cleanup = () => signal.removeEventListener('abort', abort);
    Promise.resolve(value).then((result) => { cleanup(); resolve(result); }, (error) => { cleanup(); reject(error); });
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export function closeIterator(iterator) {
  // Aborting the stream owns cleanup; a broken return() must not hold a tool open.
  try { Promise.resolve(iterator?.return?.()).catch(() => {}); } catch { /* already closed */ }
}
