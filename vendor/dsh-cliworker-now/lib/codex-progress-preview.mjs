// Public progress is a snapshot. Keep native deltas and terminal items intact.
const MAX_BYTES = 4096
const MARKER = '[预览已截断，仅显示末尾；完整输出见原生记录]\n'
export function progressPreview(text) {
  const bytes = Buffer.from(text)
  if (bytes.length <= MAX_BYTES) return text
  let start = bytes.length - (MAX_BYTES - Buffer.byteLength(MARKER))
  while ((bytes[start] & 0xc0) === 0x80) start++
  return MARKER + bytes.subarray(start).toString('utf8')
}

// Event-driven coalescing avoids timer callbacks surviving a closed bridge.
// Pending progress flushes on the next eligible delta or at completion/cleanup.
export function createProgressPreviews(emit, now = () => performance.now()) {
  const entries = new Map()
  const send = entry => {
    if (!entry.pending) return
    const event = entry.pending
    entry.pending = undefined
    const signature = JSON.stringify(event)
    if (signature === entry.sent) return
    emit(event)
    entry.sent = signature
    entry.at = now()
  }
  return {
    update(key, event) {
      let entry = entries.get(key)
      if (!entry) entries.set(key, entry = { at: -Infinity })
      const detail = progressPreview(event.detail)
      entry.pending = { ...event, detail,
        ...(event.toolCall ? { toolCall: { ...event.toolCall, output: detail } } : {}) }
      if (now() - entry.at >= 250) send(entry)
    },
    finish(key) {
      const entry = entries.get(key)
      if (entry) { send(entry); entries.delete(key) }
    },
    flush() { for (const entry of entries.values()) send(entry) },
  }
}
