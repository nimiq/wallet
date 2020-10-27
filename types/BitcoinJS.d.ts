import _BitcoinJS from 'bitcoinjs-lib';

export as namespace BitcoinJS;
export = _BitcoinJS;

declare global {
    const BitcoinJS: typeof _BitcoinJS;
}
