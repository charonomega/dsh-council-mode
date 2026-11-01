/** Plugin-page preferences use DSH's revision-checked persisted settings service. */
function CouncilConfigSettings({ form }) {
  const source = React.useMemo(() => ({ subscribe: (fn) => form.subscribe(fn), snapshot: () => form.getSnapshot() }), [form]);
  const snapshot = React.useSyncExternalStore(source.subscribe, source.snapshot);
  const [draft, setDraft] = React.useState({});
  const [editRevision, setEditRevision] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const ready = snapshot.status === 'ready' && snapshot.writable;
  const reset = () => { setDraft({}); setEditRevision(null); setMessage(''); };
  const save = async (event) => {
    event.preventDefault();
    if (busy || !ready) return;
    const ops = [];
    for (const field of COUNCIL_CONFIG_FIELDS) {
      if (!Object.hasOwn(draft, field.key)) continue;
      const value = draft[field.key].trim() === '' ? NaN : Number(draft[field.key]);
      if (!Number.isInteger(value) || value < field.min || value > field.max) {
        setMessage(`${field.description.split('：')[0]}须为 ${field.min}–${field.max} 之间的整数。`); return;
      }
      ops.push({ op: 'set', path: [field.key], value });
    }
    if (!ops.length) return;
    setBusy(true); setMessage('');
    try {
      if (await form.mutate(ops, editRevision ?? snapshot.revision)) {
        setDraft({}); setEditRevision(null); setMessage('配置已保存。议题预算的新默认值从下一个议题生效。');
      } else setMessage('保存失败或配置已被其他窗口修改。请点击“重新读取”，再修改并保存。');
    } catch (error) { setMessage(`保存失败：${error?.message || error}`); }
    finally { setBusy(false); }
  };
  return h('section', { 'aria-label': '议会配置', style: { maxWidth: 760 } },
    h('h3', null, '议会配置'),
    h('p', { style: { opacity: .75, lineHeight: 1.6 } }, '配置保存在当前 DSH 中。消息条数、唤醒次数和单条长度的新默认值从下一个议题生效；当前议题可用“结束议题”旁的“不限次数”开关。'),
    snapshot.status !== 'ready' ? h('p', { role: 'status' }, snapshot.status === 'loading' ? '正在读取配置…' : '配置暂不可用，请确认议会插件已启用并刷新页面。') : null,
    h('form', { onSubmit: save },
      ...COUNCIL_CONFIG_FIELDS.map((field) => h('label', { key: field.key, style: { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid #8883', flexWrap: 'wrap' } },
        h('span', { style: { flex: '1 1 300px' } },
          h('span', { style: { display: 'block', marginBottom: 4 } }, field.description.split('：')[0]),
          h('small', { style: { opacity: .7, lineHeight: 1.6 } }, field.description.split('：').slice(1).join('：'))),
        h('input', { type: 'number', 'aria-label': field.description.split('：')[0], min: field.min, max: field.max, step: 1,
          disabled: busy || !ready, required: true, value: draft[field.key] ?? snapshot.value?.[field.key] ?? field.default,
          onChange: (event) => { const value = event.target.value; setDraft((old) => ({ ...old, [field.key]: value })); setEditRevision((old) => old ?? snapshot.revision); setMessage(''); },
          style: { width: 150, padding: '8px 10px', border: '1px solid #8886', borderRadius: 6, background: 'transparent', color: 'inherit', font: 'inherit' } }))),
      h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
        h('button', { type: 'submit', className: 'cwm-btn cwm-btn-primary', disabled: busy || !ready || !Object.keys(draft).length }, busy ? '正在保存…' : '保存配置'),
        h('button', { type: 'button', className: 'cwm-btn', disabled: busy, onClick: reset }, '重新读取')),
      h('p', { role: 'status', style: { minHeight: 24, lineHeight: 1.6 } }, message)));
}
