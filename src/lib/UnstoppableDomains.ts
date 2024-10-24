import type Resolution from '@unstoppabledomains/resolution';
import config from 'config';
import { replaceKey } from './KeyReplacer';
import { ENV_MAIN } from './Constants';

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
        cachedResolver = new Resolver({
            sourceConfig: {
                uns: {
                    locations: {
                        Layer1: {
                            url: await replaceKey(`https://eth-${
                                config.environment === ENV_MAIN ? 'mainnet' : 'goerli'
                            }.g.alchemy.com/v2/#ALCHEMY_ETH_API_KEY#`),
                            network: config.environment === ENV_MAIN ? 'mainnet' : 'goerli',
                        },
                        Layer2: {
                            url: await replaceKey(config.polygon.rpcEndpoint.replace('wss', 'https')),
                            network: config.environment === ENV_MAIN ? 'polygon-mainnet' : 'polygon-amoy',
                        },
                    },
                },
            },
        });
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

export async function resolve(domain: string, currency: 'NIM' | 'BTC' | 'TBTC' | 'USDC' | 'USDT') {
    if (!isValidDomain(domain)) return null;
    const resolver = await getResolver();

    if (currency === 'USDC' || currency === 'USDT') {
        const errors: Error[] = [];
        const [usdAddress, maticAddress] = await Promise.all([
            resolver.multiChainAddr(domain, currency, 'MATIC').catch((error) => {
                errors.push(error);
                return '';
            }),
            resolver.addr(domain, 'MATIC').catch((error) => {
                errors.push(error);
                return '';
            }),
        ]);
        if (usdAddress) return usdAddress;
        if (maticAddress) return maticAddress;
        throw errors[0];
    }

    return resolver.addr(domain, currency);
}
