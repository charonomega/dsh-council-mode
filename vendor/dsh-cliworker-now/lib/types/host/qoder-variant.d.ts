export type QoderCliId = 'qoder' | 'qodercn';
/** The SDK control wire is shared; account roots and branded env are not. */
export declare function qoderVariant(cli?: QoderCliId): {
    cli: "qodercn";
    label: string;
    prefix: string;
    site: string;
    directory: string;
    executable: string;
    package: string;
    agent: string;
} | {
    cli: "qoder";
    label: string;
    prefix: string;
    site: string;
    directory: string;
    executable: string;
    package: string;
    agent: string;
};
