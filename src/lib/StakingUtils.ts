import { i18n } from '../i18n/i18n-setup';
import { Transaction } from '../stores/Transactions';
import { useStakingStore } from '../stores/Staking';
import { STAKING_CONTRACT_ADDRESS } from './Constants';

export enum FilterState {
    TRUST = 'trustscore',
    PAYOUT = 'payoutTime',
    REWARD = 'reward',
    SEARCH = 'search',
}

export function getStakingTransactionMeaning(transaction: Transaction, verbose: boolean): string | null {
    if (transaction.sender === STAKING_CONTRACT_ADDRESS) {
        // @ts-expect-error Missmatch with Nimiq.PlainTransactionDetails from fastspot-api
        switch (transaction.senderData.type) {
            case 'delete-validator': {
                const text = i18n.t('Delete validator') as string;
                if (!verbose) return text;
                return text;
            }
            case 'remove-stake': {
                const text = i18n.t('Unstake') as string;
                if (!verbose) return text;
                return text;
            }
            default: throw new Error('Unknown staking sender data type');
        }
    }

    if (transaction.recipient !== STAKING_CONTRACT_ADDRESS) return null;

    const rawDataFirstByte = transaction.data.type === 'raw' && transaction.data.raw.substring(0, 2);

    switch (rawDataFirstByte || transaction.data.type) {
        case '00':
        case 'create-validator': {
            const text = i18n.t('Create validator') as string;
            if (!verbose) return text;
            return text;
        }
        case '01':
        case 'update-validator': {
            const text = i18n.t('Update validator') as string;
            if (!verbose) return text;
            return text;
        }
        case '02':
        case 'deactivate-validator': {
            const text = i18n.t('Deactivate validator') as string;
            if (!verbose) return text;
            return text;
        }

        case '03':
        case 'reactivate-validator': {
            const text = i18n.t('Reactivate validator') as string;
            if (!verbose) return text;
            return text;
        }
        case '04':
        case 'retire-validator': {
            const text = i18n.t('Retire validator') as string;
            if (!verbose) return text;
            return text;
        }
        case '05':
        case 'create-staker': {
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
        case '06':
        case 'add-stake': {
            const text = i18n.t('Add stake') as string;
            if (!verbose) return text;

            // const staker = Nimiq.Address.unserialize(buf);
            // text += ` for ${staker.toUserFriendlyAddress()}`;
            return text;
        }
        case '07':
        case 'update-staker': {
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
        case '08':
        case 'set-active-stake': {
            const text = i18n.t('Set active stake') as string;

            // TODO: Read active stake amount from transaction data
            if (!verbose) return text;

            return text;
        }
        case '09':
        case 'retire-stake': {
            const text = i18n.t('Retire stake') as string;

            // TODO: Read retired stake amount from transaction data
            if (!verbose) return text;

            return text;
        }
        default: throw new Error(`Unknown staking data type: ${JSON.stringify(transaction.data)}`);
    }
}

/**
 * Check if staking in the current month is ongoing
 * @param monthKey - Month identifier in 'YYYY-MM' format (e.g., '2024-01' for January 2024)
 * @returns true if the current month is ongoing, false otherwise
 * (if the user is currently staking with the last validator in the list, it's ongoing)
 */
export function isCurrentMonthAndStakingOngoing(monthKey: string): boolean {
    const { isCurrentMonth } = isCurrentMonthAndYear(monthKey);
    if (!isCurrentMonth) return false;

    // Check if the user is currently staking with any of the validators in this list
    const { activeStake, monthlyRewards } = useStakingStore();
    if (!activeStake.value || !activeStake.value.validator) return false;

    // Check if the active validator is the last one in the list (most recent rewards)
    const validators = monthlyRewards.value.get(monthKey)?.validators;
    const lastValidatorAddress = validators?.[validators.length - 1];
    return activeStake.value.validator === lastValidatorAddress;
}

/**
 * Get the label for a month
 * @param monthKey - Month identifier in 'YYYY-MM' format (e.g., '2024-01' for January 2024)
 * @returns Month label as a string
 */
export function getMonthLabel(monthKey: string): string {
    const { date, isCurrentYear, isCurrentMonth } = isCurrentMonthAndYear(monthKey);

    if (isCurrentMonth) {
        return i18n.t('This month').toString();
    }

    return new Intl.DateTimeFormat(i18n.locale, {
        month: 'long',
        year: !isCurrentYear ? 'numeric' : undefined,
    }).format(date);
}

function isCurrentMonthAndYear(monthKey: string) {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();
    const isCurrentMonth = isCurrentYear && date.getMonth() === now.getMonth();
    return { date, isCurrentMonth, isCurrentYear };
}
