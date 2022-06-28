import { FormattableNumber } from '@nimiq/utils';
// import { DateTime } from 'luxon';
import { i18n } from '../i18n/i18n-setup';
import { Transaction } from '../stores/Transactions';
import { StakingTransactionType, STAKING_CONTRACT_ADDRESS } from './Constants';

export enum FilterState {
    TRUST,
    PAYOUT,
    REWARD,
    SEARCH,
}

// export const NOW = DateTime.now();
// export const MONTH = DateTime.fromObject({ months: 1 });

export function getPayoutText(payout: number) {
    const periods = {
        year: 60 * 24 * 30 * 12,
        month: 60 * 24 * 30,
        week: 60 * 24 * 7,
        day: 60 * 24,
        h: 60,
    };
    let index = 0;
    let value = 0;
    const periodNames = Object.keys(periods);

    for (const [, period] of Object.entries(periods)) {
        value = payout / period;
        if (value >= 1) {
            break;
        }
        index += 1;
    }

    if (index === periodNames.length - 1) {
        return i18n.t('pays out every {hourCount}', { hourCount: `${value}${periodNames[index]}` }) as string;
    }

    return i18n.t('pays out {numberOfTimes} a {period}', {
        numberOfTimes: numberToLiteralTimes(Math.floor(value)),
        period: periodNames[index],
    }) as string;
}

export function getStakingTransactionMeaning(transaction: Transaction, verbose: boolean): string | null {
    if (transaction.sender === STAKING_CONTRACT_ADDRESS) {
        return i18n.t('Unstake') as string;
    }

    if (transaction.recipient !== STAKING_CONTRACT_ADDRESS) return null;

    const type = parseInt(transaction.data.raw.substring(0, 2), 16);
    switch (type) {
        case StakingTransactionType.CREATE_STAKER: {
            const text = i18n.t('Start staking') as string;
            if (!verbose) return text;

            // const hasDelegation = buf.readUint8() === 1;
            // if (hasDelegation) {
            //     const delegation = Nimiq.Address.unserialize(buf);
            //     text += ` with validator ${delegation.toUserFriendlyAddress()}`;
            // } else {
            //     text += ' with no validator';
            // }
            return text;
        }
        case StakingTransactionType.UPDATE_STAKER: {
            const text = i18n.t('Switch validator') as string;
            if (!verbose) return text;

            // const hasDelegation = buf.readUint8() === 1;
            // if (hasDelegation) {
            //     const delegation = Nimiq.Address.unserialize(buf);
            //     text += ` to validator ${delegation.toUserFriendlyAddress()}`;
            // } else {
            //     text += ' to no validator';
            // }
            return text;
        }
        case StakingTransactionType.STAKE: {
            const text = i18n.t('Add stake') as string;
            if (!verbose) return text;

            // const staker = Nimiq.Address.unserialize(buf);
            // text += ` for ${staker.toUserFriendlyAddress()}`;
            return text;
        }
        default: throw new Error('Unknown staking data type');
    }
}

function numberToLiteralTimes(n: number): string {
    const timesTable = [
        i18n.t('zero times'), i18n.t('once'), i18n.t('twice'), i18n.t('thrice'), i18n.t('four times'),
        i18n.t('five times'), i18n.t('six times'), i18n.t('seven times'),
        i18n.t('eight times'), i18n.t('nine times'),
    ];

    if (timesTable[n]) return timesTable[n].toString();
    return i18n.t('{number} times', { number: n }).toString();
}

// function formatNumber(number: number, fractionDigits = 0): string {
//     return number.toFixed(fractionDigits); // .replace(/\B(?=(\d{3})+(?!\d))/g, '\'').trim();
// }

// function formatAsNim(nim: number, fractionDigits = 0): string {
//     return `${formatNumber(nim, fractionDigits)} NIM`;
// }

// function formatLunaAsNim(luna: number, fractionDigits = 0): string {
//     return formatAsNim(Math.round(luna / 100000), fractionDigits);
// }

export function formatAmount(value = 0, magnitude = 1): string {
    return new FormattableNumber(Math.round(value / magnitude)).toString({
        maxDecimals: 0,
        useGrouping: true,
    });
}
