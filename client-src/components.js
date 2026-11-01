/* Council Mode React components. */

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/* The host's primitives provide the official fish mark and the Markdown
 * renderer (CommonMark, tables, code fences, KaTeX). They are loaded
 * opportunistically; every use is guarded so a future host change degrades to
 * the local fallbacks instead of blanking the slot. */
let HostMarkdownText = null;
let HostMarkdownProvider = null;
let HostFishLogo = null;
try {
  const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
  HostMarkdownText = primitives?.MarkdownText ?? null;
  HostMarkdownProvider = primitives?.MarkdownDelegateProvider ?? null;
  HostFishLogo = primitives?.FishLogo ?? null;
} catch {
  HostMarkdownText = null;
  HostMarkdownProvider = null;
  HostFishLogo = null;
}

function isAbsoluteFilePath(value) {
  const path = String(value ?? '');
  return path.startsWith('/') || path.startsWith('\\\\') || /^[a-zA-Z]:[\\/]/u.test(path);
}

function resolveWorkspacePath(cwd, value) {
  const path = String(value ?? '');
  if (isAbsoluteFilePath(path)) return path;
  if (cwd === undefined || cwd === null || cwd === '') return path;
  const separator = String(cwd).includes('\\') ? '\\' : '/';
  return `${String(cwd).replace(/[/\\]+$/u, '')}${separator}${path.replace(/^[/\\]+/u, '')}`;
}

function fileMediaUrl(base, value) {
  const path = String(value ?? '');
  if (
    (!/^https?:/u.test(base) && !base.startsWith('dsh-app://app/')) ||
    !isAbsoluteFilePath(path) ||
    /^[/\\]{2}/u.test(path) ||
    /[\u0000-\u001f\u007f]/u.test(path)
  ) {
    return undefined;
  }
  try {
    return new URL(`api/file?path=${encodeURIComponent(path)}`, base).href;
  } catch {
    return undefined;
  }
}

function workspaceMediaUrl(cwd, value) {
  try {
    const base = typeof document === 'undefined' ? '' : document.baseURI;
    const path = decodeURIComponent(String(value ?? '').split(/[?#]/u)[0] ?? '');
    return fileMediaUrl(base, resolveWorkspacePath(cwd, path));
  } catch {
    return undefined;
  }
}

function icon(size, children, extra) {
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': 'true',
      focusable: 'false',
      ...extra,
    },
    children,
  );
}

function IconGroup({ size = 16 }) {
  return icon(size, [
    h('path', {
      key: 'a',
      d: 'M5.2 7.2a2.1 2.1 0 1 0 0-4.2 2.1 2.1 0 0 0 0 4.2Z',
      fill: 'currentColor',
    }),
    h('path', {
      key: 'b',
      d: 'M10.8 7.2a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z',
      fill: 'currentColor',
      opacity: '.7',
    }),
    h('path', {
      key: 'c',
      d: 'M1.6 13c0-2.1 1.6-3.5 3.6-3.5s3.6 1.4 3.6 3.5',
      stroke: 'currentColor',
      strokeWidth: '1.4',
      strokeLinecap: 'round',
    }),
    h('path', {
      key: 'd',
      d: 'M9.3 9.8c.5-.2 1-.3 1.5-.3 1.8 0 3.2 1.2 3.2 3.1',
      stroke: 'currentColor',
      strokeWidth: '1.4',
      strokeLinecap: 'round',
      opacity: '.7',
    }),
  ]);
}

function IconPlus({ size = 16 }) {
  return icon(size, [
    h('path', { key: 'p', d: 'M8 3v10M3 8h10', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round' }),
  ]);
}

function IconClose({ size = 16 }) {
  return icon(size, [
    h('path', { key: 'x', d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round' }),
  ]);
}

function IconCopy({ size = 16 }) {
  return icon(size, [
    h('rect', { key: 'a', x: '5', y: '5', width: '8', height: '8', rx: '1.4', stroke: 'currentColor', strokeWidth: '1.3' }),
    h('path', { key: 'b', d: 'M3.5 10.5V4.2c0-.9.7-1.6 1.6-1.6h6.3', stroke: 'currentColor', strokeWidth: '1.3', strokeLinecap: 'round' }),
  ]);
}

function IconCrown({ size = 14 }) {
  return icon(size, [
    h('path', {
      key: 'c',
      d: 'M2.4 11.6h11.2l-1-6.4-3.4 2.7L8 4.3 6.8 7.9 3.4 5.2l-1 6.4Z',
      fill: 'currentColor',
    }),
  ]);
}

function IconArrowDown({ size = 16 }) {
  return icon(size, [
    h('path', { key: 'a', d: 'M8 3v10M4.2 9.2 8 13l3.8-3.8', stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round' }),
  ]);
}

function IconWarning({ size = 14 }) {
  return icon(size, [
    h('path', {
      key: 'w',
      d: 'M8 2.4 14 13H2L8 2.4Z',
      stroke: 'currentColor',
      strokeWidth: '1.3',
      strokeLinejoin: 'round',
    }),
    h('path', { key: 'i', d: 'M8 6.2v3.2', stroke: 'currentColor', strokeWidth: '1.4', strokeLinecap: 'round' }),
    h('circle', { key: 'd', cx: '8', cy: '11.2', r: '.75', fill: 'currentColor' }),
  ]);
}

function IconCheck({ size = 14 }) {
  return icon(size, [
    h('path', { key: 'c', d: 'm3.2 8.4 3 3 6.6-6.8', stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round' }),
  ]);
}

function IconChevron({ size = 14 }) {
  return icon(size, [
    h('path', { key: 'c', d: 'm6 3.5 4 4.5-4 4.5', stroke: 'currentColor', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }),
  ]);
}

function Avatar({ speaker, size = 38, dark = false, onClick, title, t }) {
  const style = { width: size, height: size, minWidth: size };
  if (speaker?.kind === 'member') {
    const cli = speaker.cli;
    const meta = CLIS[cli];
    const nativeDeepseek = cli === 'deepseek';
    const key = dark && meta?.avatarDark ? meta.avatarDark : meta?.avatar;
    const src = key ? AVATARS[key] : undefined;
    const content = nativeDeepseek
      ? HostFishLogo
        ? h(HostFishLogo, { size: Math.max(16, Math.round(size * 0.7)) })
        : h('span', { className: 'cwm-avatar-mono', style: { fontSize: Math.max(9, Math.round(size * 0.24)) } }, 'DS')
      : src
        ? h('img', { src, alt: '', draggable: 'false' })
        : h('span', { className: 'cwm-avatar-fallback', style: { background: meta?.color ?? '#888' } }, meta?.short ?? '?');
    const className = nativeDeepseek ? 'cwm-avatar cwm-avatar-deepseek' : 'cwm-avatar cwm-avatar-img';
    if (typeof onClick === 'function') {
      return h(
        'button',
        {
          type: 'button',
          className: cx(className, 'cwm-avatar-button'),
          style,
          title: title ?? speaker.name,
          'aria-label': speaker.name,
          onClick,
        },
        content,
      );
    }
    return h('span', { className, style, title: title ?? speaker.name }, content);
  }
  if (speaker?.kind === 'dsh') {
    return h(
      'span',
      {
        className: cx('cwm-avatar', 'cwm-avatar-dsh', HostFishLogo && 'cwm-avatar-dsh-official'),
        style,
        title: title ?? 'DSH',
      },
      HostFishLogo
        ? h(HostFishLogo, { size: Math.max(16, Math.round(size * 0.72)) })
        : h(
            'span',
            { className: 'cwm-avatar-mono', style: { fontSize: Math.max(9, Math.round(size * 0.24)) } },
            'DSH',
          ),
    );
  }
  return h(
    'span',
    { className: 'cwm-avatar cwm-avatar-me', style, title: title ?? (t ? t('common.me') : '我') },
    t ? t('common.me') : '我',
  );
}

function markdownLabels(t) {
  return {
    code: {
      copyLabel: t('action.copy'),
      copiedLabel: t('action.copied'),
      toolbarLabels: {
        codeLabel: t('markdown.code'),
        wrapLabel: t('markdown.wrap'),
        unwrapLabel: t('markdown.unwrap'),
      },
    },
    footnotes: t('markdown.footnotes'),
  };
}

class MarkdownBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    try {
      console.warn('council: host markdown renderer failed, using local fallback', error);
    } catch {
      /* ignore */
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function safeLinkUrl(value) {
  const url = String(value ?? '').trim();
  return /^(https?:\/\/|mailto:)/iu.test(url) ? url : undefined;
}

function inlineNodes(text, keyPrefix) {
  const pattern = /(`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|\*\*[\s\S]*?\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\))/gu;
  const nodes = [];
  let last = 0;
  let match;
  let index = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith('`')) {
      nodes.push(h('code', { key, className: 'cwm-inline-code' }, token.slice(1, -1)));
    } else if (token.startsWith('$$')) {
      nodes.push(h('span', { key, className: 'cwm-math-block' }, token.slice(2, -2)));
    } else if (token.startsWith('$')) {
      nodes.push(h('span', { key, className: 'cwm-math' }, token.slice(1, -1)));
    } else if (token.startsWith('**')) {
      nodes.push(h('strong', { key }, inlineNodes(token.slice(2, -2), `${key}-b`)));
    } else if (token.startsWith('*')) {
      nodes.push(h('em', { key }, inlineNodes(token.slice(1, -1), `${key}-i`)));
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/u.exec(token);
      const url = link ? safeLinkUrl(link[2]) : undefined;
      if (link && url) {
        nodes.push(
          h('a', { key, href: url, target: '_blank', rel: 'noopener noreferrer' }, link[1]),
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(token);
    }
    last = pattern.lastIndex;
    index += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isSpecialLine(line) {
  return (
    /^```/u.test(line) ||
    /^(#{1,6})\s+/u.test(line) ||
    /^\s*>\s?/u.test(line) ||
    /^\s*([-*+]|\d+\.)\s+/u.test(line) ||
    /^\s*(---+|\*\*\*+|___+)\s*$/u.test(line)
  );
}

function renderFallbackMarkdown(text) {
  const lines = String(text ?? '').replace(/\r\n/gu, '\n').split('\n');
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === '') {
      index += 1;
      continue;
    }
    if (/^```/u.test(line)) {
      index += 1;
      const code = [];
      while (index < lines.length && !/^```/u.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(h('pre', { key: `code-${blocks.length}`, className: 'cwm-code' }, h('code', null, code.join('\n'))));
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/u.exec(line);
    if (heading) {
      blocks.push(h('div', { key: `h-${blocks.length}`, className: 'cwm-md-h' }, inlineNodes(heading[2], `h${blocks.length}`)));
      index += 1;
      continue;
    }
    if (/^\s*(---+|\*\*\*+|___+)\s*$/u.test(line)) {
      blocks.push(h('hr', { key: `hr-${blocks.length}`, className: 'cwm-md-hr' }));
      index += 1;
      continue;
    }
    if (/^\s*>\s?/u.test(line)) {
      const quote = [];
      while (index < lines.length && /^\s*>\s?/u.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/u, ''));
        index += 1;
      }
      blocks.push(
        h('blockquote', { key: `quote-${blocks.length}`, className: 'cwm-md-quote' }, inlineNodes(quote.join('\n'), `q${blocks.length}`)),
      );
      continue;
    }
    const list = /^\s*([-*+]|\d+\.)\s+/u.exec(line);
    if (list) {
      const ordered = /^\d+\./u.test(list[1]);
      const items = [];
      while (index < lines.length && /^\s*([-*+]|\d+\.)\s+/u.test(lines[index])) {
        const content = lines[index].replace(/^\s*([-*+]|\d+\.)\s+/u, '');
        items.push(h('li', { key: `li-${blocks.length}-${items.length}` }, inlineNodes(content, `li${blocks.length}-${items.length}`)));
        index += 1;
      }
      blocks.push(h(ordered ? 'ol' : 'ul', { key: `list-${blocks.length}`, className: 'cwm-md-list' }, items));
      continue;
    }
    const paragraph = [];
    while (index < lines.length && lines[index].trim() !== '' && !isSpecialLine(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(h('p', { key: `p-${blocks.length}` }, inlineNodes(paragraph.join('\n'), `p${blocks.length}`)));
  }
  return blocks;
}

function RichText({ text, t, streaming, cwd }) {
  const value = String(text ?? '');
  const [expanded, setExpanded] = React.useState(false);
  const limit = 1200;
  const clipped = expanded || value.length <= limit ? value : `${value.slice(0, limit)}…`;
  const labels = React.useMemo(() => markdownLabels(t), [t]);
  const resolveWorkspaceImage = React.useCallback(
    (target) => workspaceMediaUrl(cwd, target),
    [cwd],
  );
  const fileImages = React.useMemo(
    () => ({
      resolve: resolveWorkspaceImage,
      labels: {
        open: t('image.open'),
        loading: t('image.loading'),
        failed: t('image.failed'),
        dialog: t('image.dialog'),
        close: t('action.close'),
      },
    }),
    [t, resolveWorkspaceImage],
  );
  const pathImages = React.useMemo(
    () => ({ resolve: resolveWorkspaceImage }),
    [resolveWorkspaceImage],
  );
  const expand =
    value.length > limit
      ? h(
          'button',
          {
            type: 'button',
            className: 'cwm-expand',
            onClick: () => setExpanded((old) => !old),
            'aria-expanded': expanded,
          },
          expanded ? t('action.collapse') : t('action.expand'),
        )
      : null;
  const fallback = h('div', { className: 'cwm-md-fallback' }, renderFallbackMarkdown(clipped));
  if (HostMarkdownText) {
    const markdown = h(HostMarkdownText, {
      text: clipped,
      streaming: streaming === true,
      labels,
      fileMentions: undefined,
      pathImages,
    });
    const hosted = HostMarkdownProvider
      ? h(
          HostMarkdownProvider,
          {
            openFile: () => {},
            openExternalLink: (url) => {
              try {
                window.open(url, '_blank', 'noopener,noreferrer');
              } catch {
                /* ignore */
              }
            },
            fileImages,
          },
          markdown,
        )
      : markdown;
    return h(
      'div',
      { className: 'cwm-text cwm-markdown' },
      h(MarkdownBoundary, { fallback }, hosted),
      expand,
    );
  }
  return h('div', { className: 'cwm-text cwm-markdown' }, fallback, expand);
}

function imageAttachment(image) {
  if (!image || typeof image !== 'object') return undefined;
  if (image.attachment && typeof image.attachment === 'object') return image.attachment;
  if (image.id || image.mime || image.name || image.path) return image;
  return undefined;
}

function peekImage(loadImage, attachment) {
  if (!attachment || typeof loadImage !== 'function' || typeof loadImage.peek !== 'function') return undefined;
  try {
    return loadImage.peek(attachment);
  } catch {
    return undefined;
  }
}

function ImageTile({ image, loadImage, t, onOpen }) {
  const attachment = imageAttachment(image);
  const direct =
    (typeof image?.url === 'string' && image.url) ||
    (typeof image?.previewUrl === 'string' && image.previewUrl) ||
    (typeof image?.src === 'string' && image.src) ||
    '';
  const [src, setSrc] = React.useState(() => direct || peekImage(loadImage, attachment) || '');
  React.useEffect(() => {
    if (src || !attachment || typeof loadImage !== 'function') return undefined;
    let alive = true;
    let pending;
    try {
      pending = loadImage(attachment);
    } catch {
      return undefined;
    }
    Promise.resolve(pending)
      .then((url) => {
        if (alive && typeof url === 'string' && url !== '') setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [attachment, loadImage, src]);
  const label = image?.name || attachment?.name || t('image.dialog');
  if (!src) {
    return h('span', { className: 'cwm-image-placeholder', title: label }, t('image.failed'));
  }
  return h(
    'button',
    {
      type: 'button',
      className: 'cwm-image-tile',
      onClick: () => onOpen(src),
      title: label,
      'aria-label': label,
    },
    h('img', { src, alt: label, loading: 'lazy', decoding: 'async' }),
  );
}

function MessageImages({ images, align, loadImage, t }) {
  const [open, setOpen] = React.useState('');
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!Array.isArray(images) || images.length === 0) return null;
  return h(
    'div',
    { className: cx('cwm-images', align === 'end' && 'cwm-images-end', images.length === 1 && 'cwm-images-single') },
    images.map((image, index) =>
      h(ImageTile, {
        key: `image:${index}`,
        image,
        loadImage,
        t,
        onOpen: setOpen,
      }),
    ),
    open
      ? h(
          'div',
          {
            className: 'cwm-lightbox',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('image.dialog'),
            onClick: () => setOpen(''),
          },
          h('img', { src: open, alt: '' }),
        )
      : null,
  );
}

function MessageRow({ item, dark, t, onMemberClick, cwd, loadImage }) {
  const right = item.side === 'right';
  const speaker = item.speaker ?? {};
  const member = speaker.kind === 'member';
  const dsh = speaker.kind === 'dsh';
  const user = speaker.kind === 'user';
  const images = Array.isArray(item.images) ? item.images : [];
  const showText = String(item.text ?? '').trim() !== '';
  const itemLoadImage = item.loadImage ?? loadImage;
  const itemCwd = item.cwd ?? cwd;
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    copyText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const name = user ? t('common.me') : dsh ? t('common.dsh') : speaker.name;
  const meta = h(
    'div',
    { className: 'cwm-meta' },
    h('span', { className: 'cwm-meta-name' }, name),
    dsh ? h('span', { className: 'cwm-badge cwm-badge-owner' }, h(IconCrown, { size: 11 }), t('common.owner')) : null,
    member ? h('span', { className: 'cwm-badge cwm-badge-role' }, speaker.role) : null,
    member ? h('span', { className: 'cwm-badge' }, speaker.readOnly ? '执行权限：只读' : '执行权限：非只读或未核验') : null,
    item.final ? h('span', { className: 'cwm-badge cwm-badge-final' }, t('final.badge')) : null,
    h('span', { className: 'cwm-meta-time' }, formatClock(item.time)),
    item.routeLabel ? h('span', { className: 'cwm-route' }, item.routeLabel) : null,
  );
  const media = images.length > 0
    ? h(MessageImages, { images, align: right ? 'end' : 'start', loadImage: itemLoadImage, t })
    : null;
  const bubble = showText
    ? h(
        'div',
        {
          className: cx(
            'cwm-bubble',
            right ? 'cwm-bubble-right' : 'cwm-bubble-left',
            dsh && 'cwm-bubble-dsh',
            item.final && 'cwm-bubble-final',
          ),
        },
        h(RichText, { text: item.text, t, streaming: item.streaming === true, cwd: itemCwd }),
        item.streaming
          ? h('span', { className: 'cwm-streaming', role: 'status' }, t('message.streaming'))
          : null,
        item.interrupted ? h('span', { className: 'cwm-interrupted' }, t('message.interrupted')) : null,
        h(
          'button',
          {
            type: 'button',
            className: 'cwm-copy',
            title: copied ? t('action.copied') : t('action.copy'),
            'aria-label': t('action.copy'),
            onClick: copy,
          },
          copied ? h(IconCheck, { size: 13 }) : h(IconCopy, { size: 13 }),
        ),
      )
    : null;
  const avatar = h(Avatar, {
    speaker,
    size: 38,
    dark,
    t,
    onClick: member && typeof onMemberClick === 'function' ? () => onMemberClick(speaker.workerId) : undefined,
    title: member ? speaker.name : undefined,
  });
  return h(
    'div',
    { className: cx('cwm-row', right ? 'cwm-row-right' : 'cwm-row-left') },
    right ? null : avatar,
    h('div', { className: 'cwm-bubble-wrap' }, meta, media, bubble),
    right ? avatar : null,
  );
}

function NoticeRow({ item, t }) {
  const join = item.tone === 'join';
  const error = item.tone === 'error';
  return h(
    'div',
    {
      className: cx('cwm-notice-row', error && 'cwm-notice-error'),
      role: error ? 'alert' : 'status',
    },
    h('span', { className: 'cwm-notice-pill' }, join ? h(IconGroup, { size: 12 }) : null, item.text),
  );
}

function TimeRow({ item }) {
  return h('div', { className: 'cwm-time-row' }, item.label ?? formatClock(item.time));
}

function DayRow({ item }) {
  return h('div', { className: 'cwm-day-row' }, item.label);
}

function TypingRow({ item, t }) {
  const names = item.names.join('、');
  return h(
    'div',
    { className: 'cwm-typing-row', role: 'status' },
    h('span', { className: 'cwm-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('span', null, t('typing', { names })),
  );
}

function CouncilHeader({
  title,
  subtitle,
  phase,
  active,
  memberCount,
  canInvite,
  pending,
  onMembers,
  onInvite,
  onPending,
  onToggle,
  toggleBusy,
  t,
}) {
  return h(
    'header',
    { className: 'cwm-header' },
    h('div', { className: 'cwm-header-left' }, h('span', { className: 'cwm-header-mark' }, h(IconGroup, { size: 18 }))),
    h(
      'div',
      { className: 'cwm-header-center' },
      h('div', { className: 'cwm-header-title', title }, title || t('header.titleFallback')),
      h(
        'div',
        { className: 'cwm-header-sub' },
        subtitle,
        phase ? h('span', { className: 'cwm-phase-pill' }, h('i', { className: 'cwm-pulse' }), t(`phase.${phase}`)) : null,
      ),
    ),
    h(
      'div',
      { className: 'cwm-header-right' },
      pending
        ? h(
            'button',
            {
              type: 'button',
              className: 'cwm-head-btn cwm-head-btn-warn',
              onClick: onPending,
              title: t('pending.title'),
            },
            h(IconWarning, { size: 14 }),
            h('span', null, t('pending.short')),
          )
        : null,
      h(
        'button',
        {
          type: 'button',
          className: 'cwm-head-btn',
          onClick: onMembers,
          title: t('members.title'),
        },
        h(IconGroup, { size: 15 }),
        h('span', null, t('header.membersCount', { n: memberCount })),
      ),
      canInvite
        ? h(
            'button',
            { type: 'button', className: 'cwm-head-btn', onClick: onInvite, title: t('header.invite') },
            h(IconPlus, { size: 15 }),
            h('span', null, t('header.invite')),
          )
        : null,
      h(
        'button',
        {
          type: 'button',
          className: cx('cwm-head-btn', active ? 'cwm-head-btn-danger' : 'cwm-head-btn-primary'),
          onClick: onToggle,
          disabled: toggleBusy,
          title: active ? t('chip.disable') : t('chip.enable'),
        },
        active ? h(IconClose, { size: 14 }) : h(IconPlus, { size: 14 }),
        h('span', null, active ? t('header.exit') : t('header.enter')),
      ),
    ),
  );
}

function Banner({ tone = 'info', text, hint, actionLabel, onAction, t }) {
  return h(
    'div',
    { className: cx('cwm-banner', `cwm-banner-${tone}`), role: tone === 'error' ? 'alert' : 'status' },
    tone === 'error' ? h(IconWarning, { size: 14 }) : null,
    h('div', { className: 'cwm-banner-body' }, h('div', null, text), hint ? h('div', { className: 'cwm-banner-hint' }, hint) : null),
    actionLabel
      ? h('button', { type: 'button', className: 'cwm-banner-action', onClick: onAction }, actionLabel)
      : null,
  );
}

function EmptyCard({ title, text, children, iconNode }) {
  return h(
    'div',
    { className: 'cwm-empty-card' },
    h('div', { className: 'cwm-empty-icon' }, iconNode ?? h(IconGroup, { size: 30 })),
    h('h3', null, title),
    text ? h('p', null, text) : null,
    children ? h('div', { className: 'cwm-empty-actions' }, children) : null,
  );
}

function Modal({ title, onClose, children, footer, wide, t }) {
  const closeRef = React.useRef(null);
  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus?.();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return h(
    'div',
    {
      className: 'cwm-backdrop',
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) onClose();
      },
    },
    h(
      'div',
      {
        className: cx('cwm-modal', wide && 'cwm-modal-wide'),
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': title,
      },
      h(
        'div',
        { className: 'cwm-modal-head' },
        h('h2', null, title),
        h(
          'button',
          {
            type: 'button',
            className: 'cwm-icon-btn',
            onClick: onClose,
            'aria-label': t('action.close'),
            title: t('action.close'),
            ref: closeRef,
          },
          h(IconClose, { size: 16 }),
        ),
      ),
      h('div', { className: 'cwm-modal-body' }, children),
      footer ? h('div', { className: 'cwm-modal-foot' }, footer) : null,
    ),
  );
}

function statusLabel(status, t) {
  if (status === 'enrolled') return '已登记（执行状态见成员会话）';
  if (status === 'unverified') return '需重新登记核验';
  const key = `members.status.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

function MemberPanel({ sessionId, members, roster, dark, t, onClose, onInvite, onOpenPanel, canInvite, limitReached, focusId }) {
  const [selectedId, setSelectedId] = React.useState(focusId || members[0]?.workerId || '');
  const byId = new Map((roster ?? []).map((worker) => [worker.id, worker]));
  const selected = members.find((member) => member.workerId === selectedId) ?? members[0];
  const selectedWorker = selected ? byId.get(selected.workerId) : undefined;
  const selectedNative = selected?.kind === 'subagent';
  const [copied, setCopied] = React.useState(false);
  const footer = h(
    'div',
    { className: 'cwm-modal-actions' },
    h('button', { type: 'button', className: 'cwm-btn cwm-btn-ghost', onClick: onClose }, t('action.close')),
    h(
      'button',
      { type: 'button', className: 'cwm-btn cwm-btn-primary', onClick: onInvite, disabled: !canInvite || limitReached },
      h(IconPlus, { size: 14 }),
      limitReached ? t('invite.max') : t('members.invite'),
    ),
  );
  return h(
    Modal,
    { title: t('members.title'), onClose, footer, wide: true, t },
    members.length === 0
      ? h('div', { className: 'cwm-empty-mini' }, h(IconGroup, { size: 26 }), h('p', null, t('members.empty')))
      : h(
          'div',
          { className: 'cwm-member-layout' },
          h(
            'div',
            { className: 'cwm-member-grid' },
            members.map((member) => {
              const worker = byId.get(member.workerId);
              const native = member.kind === 'subagent';
              const status = native ? (member.verifiedParentId === sessionId ? 'enrolled' : 'unverified') : worker?.status ?? 'missing';
              return h(
                'button',
                {
                  key: member.workerId,
                  type: 'button',
                  className: cx('cwm-member-card', selected?.workerId === member.workerId && 'cwm-member-card-selected'),
                  onClick: () => setSelectedId(member.workerId),
                },
                h(Avatar, {
                  speaker: {
                    kind: 'member',
                    name: worker?.agentName || member.name,
                    cli: native ? 'deepseek' : worker?.preference?.cli,
                    role: member.roleName,
                  },
                  size: 44,
                  dark,
                  t,
                }),
                h('span', { className: 'cwm-member-name' }, worker?.agentName || member.name),
                h('span', { className: 'cwm-member-role' }, member.roleName),
                h(
                  'span',
                  { className: cx('cwm-status', `cwm-status-${status}`) },
                  h('i'),
                  statusLabel(status, t),
                ),
              );
            }),
          ),
          selected
            ? h(
                'div',
                { className: 'cwm-member-detail' },
                h(
                  'div',
                  { className: 'cwm-member-detail-head' },
                  h(Avatar, {
                    speaker: {
                      kind: 'member',
                      name: selectedWorker?.agentName || selected.name,
                      cli: selectedNative ? 'deepseek' : selectedWorker?.preference?.cli,
                    },
                    size: 52,
                    dark,
                    t,
                  }),
                  h(
                    'div',
                    null,
                    h('strong', null, selectedWorker?.agentName || selected.name),
                    h('div', { className: 'cwm-muted' }, selected.roleName),
                    h(
                      'div',
                      { className: 'cwm-badges' },
                      h('span', { className: 'cwm-badge' }, selectedNative ? `登记时权限：${selected.effectivePermission === 'read-only' ? '只读' : '非只读或未核验'}` : (selectedWorker?.mode === 'plan' || selectedWorker?.mode === 'read-only') ? '执行权限：只读' : '执行权限：非只读或未核验'),
                      h('span', { className: 'cwm-badge' }, statusLabel(selectedNative ? (selected.verifiedParentId === sessionId ? 'enrolled' : 'unverified') : selectedWorker?.status ?? 'missing', t)),
                    ),
                  ),
                ),
                h('p', { className: 'cwm-member-summary' }, selected.roleSummary),
                h(
                  'dl',
                  { className: 'cwm-facts' },
                  h('dt', null, t('members.cli')),
                  h(
                    'dd',
                    null,
                    selectedNative
                      ? 'DeepSeek 子智能体'
                      : CLIS[selectedWorker?.preference?.cli]?.label ?? selectedWorker?.preference?.cli ?? '—',
                  ),
                  h('dt', null, t('members.model')),
                  h('dd', null, selectedNative ? selected.model || 'deepseek' : selectedWorker?.preference?.model ?? '—'),
                  h('dt', null, t('members.effort')),
                  h('dd', null, selectedNative ? '—' : selectedWorker?.preference?.effort ?? '—'),
                  h('dt', null, t('members.nativeRole')),
                  h('dd', null, selectedNative ? '原生子智能体' : selectedWorker?.role?.name ?? '—'),
                  h('dt', null, t('members.workerId')),
                  h('dd', { className: 'cwm-mono' }, selected.workerId),
                ),
                h(
                  'div',
                  { className: 'cwm-detail-actions' },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'cwm-btn cwm-btn-ghost',
                      onClick: () => {
                        copyText(selectedWorker?.agentName || selected.name);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1200);
                      },
                    },
                    copied ? h(IconCheck, { size: 13 }) : h(IconCopy, { size: 13 }),
                    copied ? t('action.copied') : t('action.copy'),
                  ),
                  onOpenPanel && !selectedNative
                    ? h(
                        'button',
                        { type: 'button', className: 'cwm-btn cwm-btn-ghost', onClick: onOpenPanel },
                        h(IconChevron, { size: 13 }),
                        t('action.openPanel'),
                      )
                    : null,
                ),
              )
            : null,
        ),
    h('p', { className: 'cwm-modal-note' }, t('members.note')),
  );
}

function InviteDialog({ api, sessionId, active, membersCount, maxMembers, dark, t, runCommand, onClose }) {
  const [step, setStep] = React.useState(1);
  const [selectedCli, setSelectedCli] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState('');
  const [availability, setAvailability] = React.useState({ cli: '', checking: false, available: false, error: '' });
  const [error, setError] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const controllerRef = React.useRef(null);
  const limitReached = membersCount >= maxMembers;

  React.useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const pickCli = async (cli) => {
    setSelectedCli(cli);
    setError('');
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setAvailability({ cli, checking: true, available: false, error: '' });
    const result = await checkCliAvailability(api, sessionId, cli, controller.signal);
    if (controller.signal.aborted) return;
    setAvailability({ cli, checking: false, ...result });
  };

  const confirm = async () => {
    if (!selectedCli || !selectedRole || sending || limitReached) return;
    setSending(true);
    setError('');
    try {
      if (!active) {
        const failure = await runCommand('/council on');
        if (failure) {
          setError(failure);
          return;
        }
      }
      const failure = await runCommand(`/council invite ${selectedCli} ${selectedRole}`);
      if (failure) {
        setError(failure);
        return;
      }
      onClose();
    } finally {
      setSending(false);
    }
  };

  const title =
    step === 1 ? t('invite.stepCli') : step === 2 ? t('invite.stepRole') : t('invite.stepConfirm');
  const footer = h(
    'div',
    { className: 'cwm-modal-actions' },
    h(
      'button',
      {
        type: 'button',
        className: 'cwm-btn cwm-btn-ghost',
        onClick: () => (step === 1 ? onClose() : setStep(step - 1)),
        disabled: sending,
      },
      step === 1 ? t('action.close') : t('action.back'),
    ),
    step < 3
      ? h(
          'button',
          {
            type: 'button',
            className: 'cwm-btn cwm-btn-primary',
            disabled: sending || (step === 1 ? !selectedCli || !availability.available : !selectedRole),
            onClick: () => setStep(step + 1),
          },
          t('action.next'),
        )
      : h(
          'button',
          {
            type: 'button',
            className: 'cwm-btn cwm-btn-primary',
            disabled: sending || limitReached,
            onClick: confirm,
          },
          sending ? t('invite.sending') : t('invite.send'),
        ),
  );

  let body;
  if (!api) {
    body = h('div', { className: 'cwm-empty-mini' }, h(IconWarning, { size: 26 }), h('p', null, t('invite.noCli')));
  } else if (limitReached) {
    body = h('div', { className: 'cwm-empty-mini' }, h(IconWarning, { size: 26 }), h('p', null, t('invite.max')));
  } else if (step === 1) {
    body = h(
      'div',
      null,
      h(
        'div',
        { className: 'cwm-cli-grid' },
        CLI_IDS.map((cli) => {
          const meta = CLIS[cli];
          const selected = selectedCli === cli;
          const check = availability.cli === cli ? availability : undefined;
          return h(
            'button',
            {
              key: cli,
              type: 'button',
              className: cx('cwm-cli-card', selected && 'cwm-cli-card-selected'),
              onClick: () => pickCli(cli),
            },
            h(Avatar, {
              speaker: { kind: 'member', name: meta?.label ?? cli, cli },
              size: 40,
              dark,
              t,
            }),
            h('span', { className: 'cwm-cli-name' }, meta?.label ?? cli),
            check
              ? h(
                  'span',
                  { className: cx('cwm-cli-state', check.checking ? 'cwm-muted' : check.available ? 'cwm-ok' : 'cwm-bad') },
                  check.checking
                    ? t('invite.checking')
                    : check.available
                      ? t('invite.available')
                      : t('invite.unavailable', { error: check.error || t('invite.checkFailed') }),
                )
              : null,
          );
        }),
      ),
      error ? h('div', { className: 'cwm-form-error', role: 'alert' }, error) : null,
    );
  } else if (step === 2) {
    body = h(
      'div',
      { className: 'cwm-role-grid' },
      ROLES.map((role) =>
        h(
          'button',
          {
            key: role.id,
            type: 'button',
            className: cx('cwm-role-card', selectedRole === role.id && 'cwm-role-card-selected'),
            onClick: () => setSelectedRole(role.id),
          },
          h(
            'div',
            { className: 'cwm-role-head' },
            h('strong', null, role.name),
            role.readOnly ? h('span', { className: 'cwm-badge' }, '只读角色约定') : null,
          ),
          h('p', null, role.summary),
        ),
      ),
    );
  } else {
    const cliMeta = CLIS[selectedCli];
    const role = ROLES.find((item) => item.id === selectedRole);
    body = h(
      'div',
      { className: 'cwm-confirm' },
      h(
        'div',
        { className: 'cwm-confirm-row' },
        h(Avatar, { speaker: { kind: 'member', name: cliMeta?.label, cli: selectedCli }, size: 44, dark, t }),
        h('div', null, h('strong', null, cliMeta?.label ?? selectedCli), h('div', { className: 'cwm-muted' }, role?.name ?? selectedRole)),
      ),
      h('p', null, role?.summary),
      role?.readOnly ? h('p', { className: 'cwm-muted' }, t('invite.readonlyNote')) : null,
      h('p', { className: 'cwm-modal-note' }, t('invite.note')),
      error ? h('div', { className: 'cwm-form-error', role: 'alert' }, error) : null,
    );
  }

  return h(Modal, { title, onClose: sending ? () => {} : onClose, footer, wide: true, t }, body);
}

function CouncilView(props) {
  const { sessionId, t, runCommand, chat, loadOlder, openCliWorkerPanel, openView, loadImage } = props;
  const council = props.useProjection('council') ?? {
    active: false,
    phase: 'idle',
    topic: '',
    rounds: 2,
    members: [],
    assignments: [],
  };
  const plan = props.useProjection('plan');
  const title = props.useSessions((state) => state.byId?.[sessionId]?.displayTitle ?? '');
  const cwd = props.useSessions((state) => state.byId?.[sessionId]?.cwd ?? '');
  const subagent = props.useSessions((state) => state.byId?.[sessionId]?.origin === 'subagent');
  const pending = props.useSessionStatus
    ? props.useSessionStatus((snapshot) =>
        sessionId === undefined ? undefined : snapshot.get(sessionId)?.pendingInteraction,
      )
    : undefined;
  const pendingActive = !subagent && pending !== undefined && pending !== null;
  const openPending = () => {
    if (typeof openView !== 'function') return;
    try {
      openView('chat', '');
    } catch {
      /* view switch unavailable */
    }
  };
  const api = useCliWorkerApi();
  const dark = useDarkTheme();
  const now = useNow();
  const roster = useRosterStream(api, sessionId, !subagent);
  const members = Array.isArray(council.members) ? council.members : [];
  const streams = useMemberStreams(api, sessionId, members, !subagent);
  const subagentPresence = props.useSessions((state) =>
    members
      .filter((member) => member.kind === 'subagent')
      .map((member) => (state.byId?.[member.sessionId || member.workerId] ? '1' : '0'))
      .join(''),
  );
  const subagentChatsState = useSubagentChats(members, props.getSubagentChat, subagentPresence, props.sessionId);
  const subagentChats = subagentChatsState.snapshots;
  const subagentErrors = subagentChatsState.errors;
  const subagentItems = React.useMemo(
    () => subagentChatItems(members, subagentChats),
    [members, subagentChats],
  );
  const chatSnapshot = useChatSnapshot(chat);
  const chatNodes = React.useMemo(() => {
    if (!chatSnapshot || !Array.isArray(chatSnapshot.order)) return [];
    const nodes = chatSnapshot.nodes;
    return chatSnapshot.order.map((key) => nodes.get(key)).filter(Boolean);
  }, [chatSnapshot]);
  const labels = React.useMemo(
    () => ({
      today: t('time.today'),
      yesterday: t('time.yesterday'),
      join: (name, role) => t('notice.join', { name, role }),
      convene: (topic) => t('notice.convene', { topic }),
      assign: (member, task, reason) =>
        t('notice.assign', { member, task, reason: reason ? ` (${reason})` : '' }),
      inviting: (who) => t('notice.inviting', { who }),
      contacting: (who) => t('notice.contacting', { who }),
      commandOn: t('notice.commandOn'),
      commandOff: t('notice.commandOff'),
      commandInvite: t('notice.commandInvite'),
      command: (text) => t('notice.command', { text }),
      turnFailed: (detail) => t('notice.turnFailed', { detail }),
      memberFailed: (name, error) => t('notice.memberFailed', { name, error }),
      topicFallback: t('empty.title'),
    }),
    [t],
  );
  const legacyItems = React.useMemo(
    () =>
      mergeRoom({
        chatNodes,
        subagentItems,
        members,
        roster: roster.snapshot,
        timelines: streams.timelines,
        now,
        labels,
      }),
    [chatNodes, subagentItems, members, roster.snapshot, streams.timelines, now, labels],
  );
  const items = React.useMemo(() => {
    if (!council.room) return legacyItems;
    const rooms = [...(council.roomHistory ?? []), council.room];
    const start = rooms[0].startedAt;
    return [...legacyItems.filter((item) => item.time < start && item.type !== 'typing'), ...rooms.flatMap(autonomousRoomItems)];
  }, [legacyItems, council.room, council.roomHistory]);

  const scrollRef = React.useRef(null);
  const stickRef = React.useRef(true);
  const loadAtRef = React.useRef(0);
  const [atBottom, setAtBottom] = React.useState(true);
  const [memberPanel, setMemberPanel] = React.useState(false);
  const [memberFocus, setMemberFocus] = React.useState('');
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [commandError, setCommandError] = React.useState('');
  const [toggleBusy, setToggleBusy] = React.useState(false);
  const [roomDraft, setRoomDraft] = React.useState('');
  const [roomBusy, setRoomBusy] = React.useState(false);
  const [limitBusy, setLimitBusy] = React.useState(false);
  const submissionRef = React.useRef(null);
  const active = council.active === true;
  const maxMembers = Number.isInteger(council.maxMembers) ? council.maxMembers : 6;
  const phase = active && council.phase !== 'idle' ? council.phase : '';
  const planActive = plan?.active === true;
  const canInvite = !subagent && !!api && members.length < maxMembers;
  const subtitle = subagent
    ? t('banner.subagent')
    : active && council.topic
      ? t('header.topic', { topic: council.topic })
      : `${t('header.membersCount', { n: members.length })} · ${active ? t('header.modeOn') : t('header.modeOff')}`;

  const lastId = items.length > 0 ? items[items.length - 1].id : '';
  React.useLayoutEffect(() => {
    if (stickRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lastId, items.length]);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);

  const onScroll = (event) => {
    const element = event.currentTarget;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    const bottom = distance < 80;
    stickRef.current = bottom;
    setAtBottom(bottom);
    if (element.scrollTop < 60 && Date.now() - loadAtRef.current > 1200 && typeof loadOlder === 'function') {
      loadAtRef.current = Date.now();
      Promise.resolve(loadOlder()).catch(() => {});
    }
  };
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      stickRef.current = true;
      setAtBottom(true);
    }
  };
  const toggle = async () => {
    setToggleBusy(true);
    setCommandError('');
    const failure = await runCommand(active ? '/council off' : '/council on');
    if (failure) setCommandError(failure);
    setToggleBusy(false);
  };
  const runLine = async (line) => {
    setCommandError('');
    const failure = await runCommand(line);
    if (failure) setCommandError(failure);
  };
  const sendRoom = async (fresh = false) => {
    if (roomBusy || !roomDraft.trim()) return;
    setRoomBusy(true); setCommandError('');
    const verb = fresh || !council.room ? 'start' : 'say';
    const content = roomDraft.trim(), key = `${verb}:${content}`;
    if (submissionRef.current?.key !== key) submissionRef.current = { key, id: crypto.randomUUID() };
    try {
      const failure = await runCommand(`/council ${verb} ${JSON.stringify({ content, id: submissionRef.current.id })}`);
      if (failure) setCommandError(failure);
      else { setRoomDraft(''); submissionRef.current = null; }
    } catch (error) { setCommandError(String(error?.message || error)); }
    finally { setRoomBusy(false); }
  };
  const toggleCountLimit = async () => {
    if (limitBusy) return;
    setLimitBusy(true);
    try { await runLine(`/council unlimited ${council.room?.unlimited ? 'off' : 'on'}`); }
    catch (error) { setCommandError(String(error?.message || error)); }
    finally { setLimitBusy(false); }
  };

  const banners = [];
  if (subagent) {
    banners.push(
      h(EmptyCard, {
        key: 'subagent',
        title: t('subagent.title'),
        text: t('subagent.text'),
        iconNode: h(IconGroup, { size: 30 }),
      }),
    );
  } else {
    if (pendingActive) {
      banners.push(
        h(Banner, {
          key: 'pending',
          tone: 'warn',
          text: t('pending.text'),
          actionLabel: t('pending.action'),
          onAction: openPending,
          t,
        }),
      );
    }
    const nativeError = Object.values(subagentErrors ?? {})[0] ?? '';
    if (nativeError) {
      banners.push(
        h(Banner, {
          key: 'native-chat',
          tone: 'error',
          text: t('error.nativeChat', { detail: nativeError }),
          t,
        }),
      );
    }
    if (!api) {
      banners.push(h(Banner, { key: 'nocli', tone: 'warn', text: t('banner.noCli'), hint: t('banner.noCliHint'), t }));
    }
    if (!active) {
      banners.push(
        h(Banner, {
          key: 'inactive',
          tone: 'info',
          text: t('banner.inactive'),
          actionLabel: t('action.enable'),
          onAction: toggle,
          t,
        }),
      );
    }
    if (planActive) {
      banners.push(
        h(Banner, {
          key: 'plan',
          tone: 'warn',
          text: t('banner.plan'),
          actionLabel: t('banner.planAction'),
          onAction: () => runLine('/plan off'),
          t,
        }),
      );
    }
    if (commandError) {
      banners.push(h(Banner, { key: 'command-error', tone: 'error', text: commandError, t }));
    }
    if (streams.error || roster.error) {
      banners.push(
        h(Banner, {
          key: 'stream-error',
          tone: 'error',
          text: t('error.stream'),
          actionLabel: t('action.retry'),
          onAction: () => {
            streams.reconnect();
            roster.reconnect();
          },
          t,
        }),
      );
    }
  }

  const hasConversation = items.some((item) => item.type === 'message' || item.type === 'notice');
  const body =
    subagent ? null : hasConversation ? (
      h(
        'div',
        { className: 'cwm-inner' },
        items.map((item) => {
          if (item.type === 'day') return h(DayRow, { key: item.id, item });
          if (item.type === 'time') return h(TimeRow, { key: item.id, item });
          if (item.type === 'notice') return h(NoticeRow, { key: item.id, item, t });
          if (item.type === 'typing') return h(TypingRow, { key: item.id, item, t });
          return h(MessageRow, {
            key: item.id,
            item,
            dark,
            t,
            cwd,
            loadImage,
            onMemberClick: (workerId) => {
              setMemberFocus(workerId || '');
              setMemberPanel(true);
            },
          });
        }),
      )
    ) : h(
      'div',
      { className: 'cwm-inner' },
      h(
        EmptyCard,
        {
          title: active && members.length === 0 ? t('empty.noMembers') : t('empty.title'),
          text: active
            ? members.length === 0
              ? t('empty.noMembersText')
              : t('empty.text')
            : t('empty.text'),
        },
        !active
          ? h('button', { type: 'button', className: 'cwm-btn cwm-btn-primary', onClick: toggle }, t('action.enable'))
          : canInvite
            ? h(
                'button',
                { type: 'button', className: 'cwm-btn cwm-btn-primary', onClick: () => setInviteOpen(true) },
                h(IconPlus, { size: 14 }),
                t('empty.invite'),
              )
            : null,
      ),
    );

  return h(
    'div',
    { className: cx('cwm-root', dark && 'cwm-dark') },
    h(CouncilHeader, {
      title: title || t('header.titleFallback'),
      subtitle,
      phase,
      active,
      memberCount: members.length,
      canInvite,
      pending: pendingActive,
      onMembers: () => setMemberPanel(true),
      onInvite: () => setInviteOpen(true),
      onPending: openPending,
      onToggle: toggle,
      toggleBusy,
      t,
    }),
    banners.length > 0 ? h('div', { className: 'cwm-banners' }, banners) : null,
    h(
      'div',
      { className: 'cwm-scroll', ref: scrollRef, onScroll },
      body,
    ),
    active && !subagent ? h('div', { className: 'cwm-room-composer' },
      h('div', { className: 'cwm-room-status', role: 'status' },
        council.room ? `自主讨论 · ${{ running: '讨论中', idle: '暂时无人发言', paused: '已暂停', stopped: '已结束' }[council.room.status] || council.room.status} · ${council.room.unlimited ? `${council.room.messages.length} 条 · 消息与唤醒次数不限` : `${council.room.messages.length}/${council.room.limits.maxMessages} 条 · 每成员最多 ${council.room.limits.maxTurnsPerMember} 次唤醒`}` : '在此输入议题，直接交给成员自由讨论。',
        council.room?.reason ? h('span', null, ` · ${council.room.reason}`) : null),
      council.room?.deliveries.some((d) => d.status === 'uncertain') ? h('details', null,
        h('summary', null, '存在未确认投递，展开核对'),
        council.room.deliveries.filter((d) => d.status === 'uncertain').map((d) => h('div', { key: d.id, className: 'cwm-room-uncertain' },
          h('span', null, `${council.room.members.find((m) => (m.sessionId || m.workerId) === d.memberId)?.name || d.memberId} · 消息 ${d.seqs.join(', ')} · ${d.error || '重启前运行未确认'}`),
          h('button', { type: 'button', className: 'cwm-btn', onClick: () => runLine(`/council room-resolve ${d.id} received`) }, '已核对：已收到'),
          h('button', { type: 'button', className: 'cwm-btn', onClick: () => runLine(`/council room-resolve ${d.id} retry`) }, '已核对：重新投递')))) : null,
      h('textarea', { value: roomDraft, maxLength: 8000, disabled: roomBusy, rows: 2,
        'aria-label': '自主议会消息', placeholder: '输入议题或补充意见；成员直接互相交流，主控无需转发',
        onChange: (event) => setRoomDraft(event.target.value),
        onKeyDown: (event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) { event.preventDefault(); void sendRoom(); } } }),
      h('div', { className: 'cwm-room-actions' },
        h('button', { type: 'button', className: 'cwm-btn cwm-btn-primary', disabled: roomBusy || members.length < 2 || !roomDraft.trim() || ['paused', 'stopped'].includes(council.room?.status), onClick: () => sendRoom() }, council.room ? '发送补充' : '开始讨论'),
        council.room ? h('button', { type: 'button', className: 'cwm-btn', disabled: roomBusy || !roomDraft.trim(), onClick: () => sendRoom(true) }, '开始新议题') : null,
        council.room?.status === 'running' ? h('button', { type: 'button', className: 'cwm-btn', onClick: () => runLine('/council pause') }, '暂停派发') : null,
        council.room?.status === 'paused' ? h('button', { type: 'button', className: 'cwm-btn', onClick: () => runLine('/council resume') }, '继续讨论') : null,
        council.room && council.room.status !== 'stopped' ? h('button', { type: 'button', className: 'cwm-btn', onClick: () => runLine('/council stop') }, '结束议题') : null,
        council.room ? h('button', { type: 'button', role: 'switch', className: 'cwm-count-switch',
          'aria-checked': council.room.unlimited === true, 'aria-label': '不限次数',
          disabled: limitBusy || roomBusy || council.room.status === 'stopped', onClick: toggleCountLimit,
          title: '当前议题不限制消息条数和每位成员的唤醒次数；讨论时限与单条发言长度仍保留。暂停的议题需点击“继续讨论”。' },
          h('span', { className: 'cwm-count-switch-track', 'aria-hidden': true }, h('span', null)), '不限次数') : null,
        members.length < 2 ? h('span', null, '请先加入至少两位成员') : null),
    ) : null,
    !atBottom
      ? h(
          'button',
          { type: 'button', className: 'cwm-jump', onClick: scrollToBottom, title: t('action.jump') },
          h(IconArrowDown, { size: 15 }),
          t('action.jump'),
        )
      : null,
    memberPanel
      ? h(MemberPanel, {
          sessionId: props.sessionId,
          members,
          roster: roster.workers,
          dark,
          t,
          onClose: () => setMemberPanel(false),
          onInvite: () => {
            setMemberPanel(false);
            setInviteOpen(true);
          },
          onOpenPanel: api && openCliWorkerPanel ? openCliWorkerPanel : undefined,
          canInvite,
          limitReached: members.length >= maxMembers,
          focusId: memberFocus,
        })
      : null,
    inviteOpen
      ? h(InviteDialog, {
          api,
          sessionId,
          active,
          membersCount: members.length,
          maxMembers,
          dark,
          t,
          runCommand,
          onClose: () => setInviteOpen(false),
        })
      : null,
  );
}

function CouncilModeChip(props) {
  const { sessionId, t, runCommand } = props;
  const council = props.useProjection('council');
  const subagent = props.useSessions((state) => state.byId?.[sessionId]?.origin === 'subagent');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  if (!council || subagent) return null;
  const active = council.active === true;
  const toggle = async () => {
    setBusy(true);
    setError('');
    const failure = await runCommand(active ? '/council off' : '/council on');
    if (failure) setError(failure);
    setBusy(false);
  };
  return h(
    'button',
    {
      type: 'button',
      className: cx('cwm-chip', active && 'cwm-chip-active', error && 'cwm-chip-error'),
      'aria-pressed': active,
      disabled: busy,
      onClick: toggle,
      title: error || (active ? t('chip.disable') : t('chip.enable')),
      'aria-label': error ? `${t('chip.label')}: ${error}` : t('chip.label'),
    },
    h(IconGroup, { size: 14 }),
    h('span', null, t('chip.label')),
    active ? h('i', { className: 'cwm-chip-dot' }) : null,
    error ? h('span', { className: 'cwm-chip-bang' }, '!') : null,
  );
}


