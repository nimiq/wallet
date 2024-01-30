import { useSettingsStore } from '../stores/Settings';
import { CryptoCurrency } from './Constants';

export function twoDigit(value: number) {
    if (value < 10) return `0${value}`;
    return value.toString();
}

export function calculateDisplayedDecimals(amount: number | null, currency: CryptoCurrency | 'usdc.e') {
    if (amount === null) return 0;

    const { decimals, btcDecimals, usdcDecimals, btcUnit } = useSettingsStore();

    if (currency === CryptoCurrency.BTC) {
        const maxDecimals = Math.min(btcDecimals.value, btcUnit.value.decimals);
        if (amount === 0) return maxDecimals;

        if (btcUnit.value.ticker === 'mBTC') {
            // For mBTC, make sure that 2 significant digits are always displayed
            if (amount < 0.001 * 1e5) return 5;
            if (amount < 0.01 * 1e5) return Math.max(maxDecimals, 4);
            if (amount < 0.1 * 1e5) return Math.max(maxDecimals, 3);
            if (amount < 1 * 1e5) return Math.max(maxDecimals, 2);
            if (amount < 10 * 1e5) return Math.max(maxDecimals, 1);
        } else {
            // For BTC, make sure that 3 significant digits are always displayed
            if (amount < 0.00001 * 1e8) return 8;
            if (amount < 0.0001 * 1e8) return Math.max(maxDecimals, 7);
            if (amount < 0.001 * 1e8) return Math.max(maxDecimals, 6);
            if (amount < 0.01 * 1e8) return Math.max(maxDecimals, 5);
            if (amount < 0.1 * 1e8) return Math.max(maxDecimals, 4);
            if (amount < 1 * 1e8) return Math.max(maxDecimals, 3);
            if (amount < 10 * 1e8) return Math.max(maxDecimals, 2);
            if (amount < 100 * 1e8) return Math.max(maxDecimals, 1);
        }
        return maxDecimals;
    }

    if (currency === CryptoCurrency.USDC || currency === 'usdc.e') {
        // For USDC, make sure that 2 significant digits are always displayed
        if (amount === 0) return usdcDecimals.value;
        if (amount < 0.0001 * 1e6) return 6;
        if (amount < 0.001 * 1e6) return Math.max(usdcDecimals.value, 5);
        if (amount < 0.01 * 1e6) return Math.max(usdcDecimals.value, 4);
        if (amount < 0.1 * 1e6) return Math.max(usdcDecimals.value, 3);
        if (amount < 1 * 1e6) return Math.max(usdcDecimals.value, 2);
        if (amount < 10 * 1e6) return Math.max(usdcDecimals.value, 1);
        return usdcDecimals.value;
    }

    // For NIM, make sure that 2 significant digits are always displayed
    if (amount === 0) return decimals.value;
    if (amount < 0.001 * 1e5) return 5;
    if (amount < 0.01 * 1e5) return Math.max(decimals.value, 4);
    if (amount < 0.1 * 1e5) return Math.max(decimals.value, 3);
    if (amount < 1 * 1e5) return Math.max(decimals.value, 2);
    if (amount < 10 * 1e5) return Math.max(decimals.value, 1);
    return decimals.value;
}
