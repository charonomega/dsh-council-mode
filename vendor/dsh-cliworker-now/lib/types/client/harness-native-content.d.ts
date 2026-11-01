import type { Context } from '@deepseek-ai/cordis';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'cliworker.native.sidebar': {
            kind: 'single';
            scope: 'session';
            owner: {
                composerPresentation?: 'default' | 'main';
                commandSource?: string;
                childImageUploads?: boolean;
            };
        };
    }
}
/**
 * The official child sidebar owns the complete conversation presentation.
 * Register that exact component in our Worker body seat; the renderer supplies
 * its standard hooks from the real child SessionProvider on every render.
 */
export declare function installHarnessNativeContent(ctx: Pick<Context, 'slots'>): () => void;
