/* Council Mode client entry: slots, locale, styles, and the CLI Worker API bridge. */

const NS = 'council';

const inject = ['slots', 'locale', 'sessions', 'uiConversation', 'remote', 'remote.commands'];

function installStyles() {
  const style = document.createElement('style');
  style.dataset.councilMode = 'true';
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
  return () => style.remove();
}

function apply(ctx) {
  const t = ctx.locale.bind(NS);
  ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'council: dictionaries');
  ctx.effect(installStyles, 'council: styles');

  ctx.inject(['configForms'], (scope) => {
    const form = scope.configForms.get('council-mode');
    scope.slots.inject('plugins.bundle.config', () => scope.slots.register({
      name: 'plugins.bundle.config', key: '@local/dsh-council-mode',
      inject: () => ({ form }),
    }, CouncilConfigSettings));
  });

  ctx.inject(['remote.cliworker'], (scope) => {
    setCliWorkerApi({ remote: scope.remote, cliworker: scope.remote.cliworker });
    scope.effect(() => () => setCliWorkerApi(null), 'council: cliworker api');
  });

  ctx.slots.inject('conversation.view', () =>
    ctx.slots.register(
      {
        name: 'conversation.view',
        id: 'council',
        order: 10,
        locale: NS,
        label: () => t('view.council'),
        inject: (sessionId) => {
          const binding = ctx.sessions.binding(sessionId);
          const loadImage = (attachment) => ctx.uiConversation?.imageUrl?.(sessionId, attachment);
          loadImage.peek = (attachment) => ctx.uiConversation?.peekImageUrl?.(sessionId, attachment);
          const getSubagentChat = (childSessionId) => {
            if (typeof childSessionId !== 'string' || childSessionId === '') return undefined;
            try {
              // binding() only borrows an already-open generation. Retain the
              // addressed child session first so its chat target and history exist.
              const reference = ctx.sessions.retain(childSessionId, {
                source: `council-native:${childSessionId}`,
              });
              const ready = reference.ready.then((binding) => {
                const chat = ctx.uiConversation.binding(binding).target('chat');
                const childLoadImage = (attachment) =>
                  ctx.uiConversation?.imageUrl?.(childSessionId, attachment);
                childLoadImage.peek = (attachment) =>
                  ctx.uiConversation?.peekImageUrl?.(childSessionId, attachment);
                return { chat, loadImage: childLoadImage };
              });
              ready.catch(() => reference.release());
              return { reference, ready };
            } catch {
              return undefined;
            }
          };
          return {
            chat: ctx.uiConversation.binding(binding).target('chat'),
            runCommand: (line) => executeCommand(ctx, sessionId, line),
            loadOlder: () => binding.session.loadOlder(),
            openCliWorkerPanel: () => openCliWorkerPanel(ctx),
            loadImage,
            getSubagentChat,
          };
        },
      },
      CouncilView,
    ),
  );

  ctx.slots.inject('conversation.input.left', () =>
    ctx.slots.register(
      {
        name: 'conversation.input.left',
        id: 'council-mode',
        order: 10,
        locale: NS,
        label: () => t('chip.label'),
        inject: (sessionId) => ({
          runCommand: (line) => executeCommand(ctx, sessionId, line),
        }),
      },
      CouncilModeChip,
    ),
  );
}

