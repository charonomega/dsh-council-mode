import type { CliId } from '../shared/types.ts';
/** Transparent PNGs, bundled locally without remote asset requests. */
export declare function BrandIcon({ cli, size, tone, }: {
    cli?: CliId;
    size?: number;
    tone?: 'color' | 'monochrome';
}): import("react/jsx-runtime").JSX.Element;
declare const paths: {
    readonly back: "m14 5-7 7 7 7M7 12h13";
    readonly chevron: "m9 5 7 7-7 7";
    readonly search: "m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0";
    readonly send: "M12 20V4m-7 7 7-7 7 7";
    readonly tool: "m5 7 5 5-5 5m8 0h6";
    readonly settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z";
    readonly more: "M5 12h.01M12 12h.01M19 12h.01";
    readonly logout: "M9 4H5v16h4M12 12h9m-4-4 4 4-4 4";
};
export declare function Glyph({ name }: {
    name: keyof typeof paths | 'stop' | 'copy';
}): import("react/jsx-runtime").JSX.Element;
export {};
