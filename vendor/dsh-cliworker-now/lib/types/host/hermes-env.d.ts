/** Deliberately bounded subset shared by Host discovery and the sandbox. Native
 * python-dotenv also accepts quoted keys and multiline forms; accepting those
 * without exactly matching its parser could change the pinned account home. */
export declare function parseHermesOwnEnvironment(source: string): Record<string, string>;
