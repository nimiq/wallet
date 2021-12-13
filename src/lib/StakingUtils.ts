import { i18n } from '../i18n/i18n-setup';
import { Transaction } from '../stores/Transactions';
import { StakingTransactionType, STAKING_CONTRACT_ADDRESS } from './Constants';
import { numberToLiteralTimes } from './NumberFormatting';

export function getPayoutText(payout: number) {
    const periods = {
        year: (((3600 * 1000) * 24) * 30) * 12,
        month: ((3600 * 1000) * 24) * 30,
        week: ((3600 * 1000) * 24) * 7,
        day: (3600 * 1000) * 24,
        h: 3600 * 1000,
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

    const type = parseInt(transaction.data.substring(0, 2), 16);
    switch (type) {
        case StakingTransactionType.CREATE_STAKER: {
            let text = i18n.t('Start staking') as string;
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
            let text = i18n.t('Change validator') as string;
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
            let text = i18n.t('Add stake') as string;
            if (!verbose) return text;

            // const staker = Nimiq.Address.unserialize(buf);
            // text += ` for ${staker.toUserFriendlyAddress()}`;
            return text;
        }
        default: throw new Error('Unknown staking data type');
    }
}
