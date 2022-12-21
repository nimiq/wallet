import type Resolution from '@unstoppabledomains/resolution';

let importPromise: Promise<typeof Resolution> | undefined;
let cachedResolver: Resolution | undefined;

// eslint-disable-next-line max-len
// https://docs.unstoppabledomains.com/send-and-receive-crypto-payments/resolution-libraries#supported-domains-for-resolution-libraries
// without ENS (those require extra dependencies)
const SUPPORTED_TLDS = [
    'zil',
    'crypto',
    'nft',
    'blockchain',
    'bitcoin',
    'wallet',
    '888',
    'dao',
    'x',
];

async function getResolver() {
    if (cachedResolver) return cachedResolver;

    if (!importPromise) {
        importPromise = import('@unstoppabledomains/resolution').then((module) => module.default);
        const Resolver = await importPromise;
        cachedResolver = new Resolver();
        return cachedResolver;
    }

    while (!cachedResolver) {
        await importPromise; // eslint-disable-line no-await-in-loop
    }
    return cachedResolver;
}

export function isValidDomain(domain: string): boolean {
    const parts = domain.split('.');
    return parts.length === 2 && SUPPORTED_TLDS.includes(parts[1]);
}

export async function resolve(domain: string, currency: 'NIM' | 'BTC' | 'TBTC' | 'USDC') {
    if (!isValidDomain(domain)) return null;
    const resolver = await getResolver();

    if (currency === 'USDC') {
        const errors: Error[] = [];
        const [usdcAddress, maticAddress] = await Promise.all([
            resolver.multiChainAddr(domain, 'USDC', 'MATIC').catch((error) => {
                errors.push(error);
                return '';
            }),
            resolver.addr(domain, 'MATIC').catch((error) => {
                errors.push(error);
                return '';
            }),
        ]);
        if (usdcAddress) return usdcAddress;
        if (maticAddress) return maticAddress;
        throw errors[0];
    }

    return resolver.addr(domain, currency);
}
