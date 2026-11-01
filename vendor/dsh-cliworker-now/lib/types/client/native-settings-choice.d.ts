export declare function NativeChoice({ label, selected, choices, disabled, onChange, placeholder, describedBy, }: {
    label: string;
    selected: string;
    choices: {
        id: string;
        label: string;
        disabled?: boolean;
    }[];
    disabled: boolean;
    onChange: (value: string) => void;
    placeholder?: string;
    describedBy?: string;
}): import("react/jsx-runtime").JSX.Element;
