// TypeScript 4.5 cannot parse viem's type declarations, which need TypeScript 5. The tsconfigs map the module to these
// declarations of the parts of viem that the Wallet uses.

export interface EIP1193RequestArguments {
    readonly method: string;
    readonly params?: unknown;
}

export interface Transport {
    readonly __transport: unique symbol;
}

/** An opaque viem client, for @nimiq/gasless-sdk/viem. */
export interface Client {
    readonly request: (args: EIP1193RequestArguments) => Promise<unknown>;
}

export function custom(
    provider: { request(args: EIP1193RequestArguments): Promise<unknown> },
    config?: { key?: string, name?: string, retryCount?: number, retryDelay?: number },
): Transport;

export function createClient(parameters: {
    transport: Transport,
    key?: string,
    name?: string,
    pollingInterval?: number,
}): Client;
