/**
 * Host text in the interface language when the dictionary knows it; other
 * Host and CLI text stays verbatim rather than guessing a translation.
 */
export declare function hostText(text: string): string;
export declare function hostText(text: string | undefined): string | undefined;
/** Keep transport traces out of the conversation and selection options. */
export declare function operationMessage(error: unknown): string;
