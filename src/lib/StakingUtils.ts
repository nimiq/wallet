// import { DateTime } from 'luxon';
import { i18n } from '../i18n/i18n-setup';
import { Transaction } from '../stores/Transactions';
import { StakingTransactionType, STAKING_CONTRACT_ADDRESS } from './Constants';

export enum FilterState {
    TRUST = 'trustscore',
    PAYOUT = 'payoutTime',
    REWARD = 'reward',
    SEARCH = 'search',
}

// export const NOW = DateTime.now();
// export const MONTH = DateTime.fromObject({ months: 1 });

export function getPayoutText(payoutType: 'direct' | 'restake') {
    switch (payoutType) {
        case 'direct': return i18n.t('Wallet Payout');
        case 'restake': return i18n.t('Restake Rewards');
        default: throw new Error('Invalid payout type');
    }
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
        case StakingTransactionType.ADD_STAKE: {
            const text = i18n.t('Add stake') as string;
            if (!verbose) return text;

            // const staker = Nimiq.Address.unserialize(buf);
            // text += ` for ${staker.toUserFriendlyAddress()}`;
            return text;
        }
        case StakingTransactionType.SET_INACTIVE_STAKE: {
            const text = i18n.t('Set inactive stake') as string;
            if (!verbose) return text;

            return text;
        }
        default: throw new Error('Unknown staking data type');
    }
}
