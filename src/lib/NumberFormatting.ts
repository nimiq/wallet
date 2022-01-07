import { FormattableNumber } from '@nimiq/utils';
import { useSettingsStore } from '../stores/Settings';
import { CryptoCurrency } from './Constants';
import { i18n } from '../i18n/i18n-setup';

export function twoDigit(value: number) {
    if (value < 10) return `0${value}`;
    return value.toString();
}

export function calculateDisplayedDecimals(amount: number | null, currency: CryptoCurrency) {
    if (amount === null) return 0;

    const { decimals, btcDecimals, btcUnit } = useSettingsStore();

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

    // For NIM, make sure that 2 significant digits are always displayed
    if (amount === 0) return decimals.value;
    if (amount < 0.001 * 1e5) return 5;
    if (amount < 0.01 * 1e5) return Math.max(decimals.value, 4);
    if (amount < 0.1 * 1e5) return Math.max(decimals.value, 3);
    if (amount < 1 * 1e5) return Math.max(decimals.value, 2);
    if (amount < 10 * 1e5) return Math.max(decimals.value, 1);
    return decimals.value;
}

export function numberToLiteral(n: number): string {
    // https://stackoverflow.com/questions/5529934/javascript-numbers-to-words refactored
    const ones = ['', i18n.t('one'), 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const tens = ['', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
        'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    const magnitudes = [
        ['million', 1e6, null],
        ['thousand', 1e3, null],
        ['hundred', 1e2, null],
        ['', 2e1, [tens, ones]],
        ['', 1e1, [teens], 10],
        ['', 0, [ones], 0],
    ];

    if (n === 0) return i18n.t('zero').toString();
    return magnitudes.reduce((result: string, mag: Array<any>) => {
        if (n >= mag[1]) {
            if (mag[2] === null) {
                result += i18n.t('{number} {magnitude}', {
                    number: numberToLiteral(Math.floor(n / mag[1])),
                    magnitude: mag[0],
                });
                n %= mag[1];
            } else if (mag[2].length === 2) {
                const hi = Math.floor(n / mag[2][0].length) - 1;
                const lo = n % mag[2][1].length;
                result += i18n.t('{hi} {lo}', { hi: mag[2][0][hi], lo: mag[2][1][lo] });
            } else if (mag[2].length === 1) {
                result += i18n.t(mag[2][0][n - mag[3]]);
            }
        }
        return result;
    }, '').trim();
}

export function numberToLiteralTimes(n: number): string {
    const timesTable = [
        i18n.t('zero times'), i18n.t('once'), i18n.t('twice'), i18n.t('thrice'), i18n.t('four times'),
        i18n.t('five times'), i18n.t('six times'), i18n.t('seven times'),
        i18n.t('eight times'), i18n.t('nine times'),
    ];

    if (timesTable[n]) return timesTable[n].toString();
    return i18n.t('{number} times', { number: n }).toString();
}

export function formatNumber(number: number, fractionDigits = 0): string {
    return number.toFixed(fractionDigits);// .replace(/\B(?=(\d{3})+(?!\d))/g, '\'').trim();
}

export function formatAsNim(nim: number, fractionDigits = 0): string {
    return `${formatNumber(nim, fractionDigits)} NIM`;
}

export function formatLunaAsNim(luna: number, fractionDigits = 0): string {
    return formatAsNim(Math.round(luna / 100000), fractionDigits);
}

export const formatAmount = (value = 0, magnitude = 1): string => (
    new FormattableNumber(Math.round(value / magnitude)).toString({
        maxDecimals: 0,
        useGrouping: true,
    })
);
