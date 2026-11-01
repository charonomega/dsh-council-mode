import { type ReactNode } from 'react';
/** Same positioning/dismissal primitives and geometry as Harness useStatDialog. */
export declare function StatPopover({ label, tooltip, context, className, trigger, children, }: {
    label: string;
    tooltip?: string;
    context?: boolean;
    className?: string;
    trigger: ReactNode;
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
