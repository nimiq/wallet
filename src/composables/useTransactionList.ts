import { computed, ref, Ref } from '@vue/composition-api';
import { AddressBook } from '@nimiq/utils';
import { useI18n } from '@/lib/useI18n';
import { useAddressStore } from '../stores/Address';
import { toMs, Transaction, TransactionState } from '../stores/Transactions';
import { useContactsStore } from '../stores/Contacts';
import { useNetworkStore } from '../stores/Network';
import { parseData } from '../lib/DataFormatting';
import { STAKING_CONTRACT_ADDRESS } from '../lib/Constants';
import { useTransactionInfo } from './useTransactionInfo';
import { useStakingRewards } from './useStakingRewards';
import { useWindowSize } from './useWindowSize';

/**
 * useTransactionList composable
 *
 * Provides a computed transaction list for the active address, including month labels and loading placeholders.
 * Also provides filtered transactions and item size for rendering.
 *
 * Note: If scrollerBuffer is not provided, no placeholder transactions will be returned during loading.
 *
 * @param options - { searchString: Ref<string>, scrollerBuffer?: number }
 *
 * @returns {
 *   transactions: ComputedRef<any[]>,
 *   filteredTxs: ComputedRef<Transaction[]>,
 *   itemSize: ComputedRef<number>
 * }
 *
 * @example
 * import { useTransactionList } from '@/composables/useTransactionList';
 * import { ref } from '@vue/composition-api';
 *
 * const searchString = ref('');
 * const scrollerBuffer = 300;
 *
 * const { transactions, filteredTxs, itemSize } = useTransactionList({
 *   searchString,
 *   scrollerBuffer,
 * });
 *
 * // Use `transactions` in your template for rendering
 *
 * // Without scrollerBuffer (no placeholder transactions):
 * const { transactions, filteredTxs, itemSize } = useTransactionList({ searchString });
 */

function processTimestamp(timestamp: number) {
    const date: Date = new Date(timestamp);

    return {
        month: date.getMonth(),
        year: date.getFullYear(),
        date,
    };
}

function getLocaleMonthStringFromDate(
    date: Date,
    locale: string,
    options: {
        month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow',
        year?: 'numeric' | '2-digit',
    },
) {
    return new Intl.DateTimeFormat(locale, options).format(date);
}

export interface UseTransactionListOptions {
    searchString: Ref<string>;
    scrollerBuffer?: number;
}

export function useTransactionList(options: UseTransactionListOptions) {
    const { $t, locale } = useI18n();
    const { state: addresses$, transactionsForActiveAddress } = useAddressStore();
    const { isFetchingTxHistory } = useNetworkStore();
    const { getLabel: getContactLabel } = useContactsStore();
    const { monthlyRewards } = useStakingRewards();
    const { isMobile } = useWindowSize();

    // Height of items in pixel
    const itemSize = computed(() => isMobile.value ? 68 : 72); // mobile: 64px + 4px margin between items

    // Apply search filter
    const filteredTxs = computed(() => {
        if (!options.searchString.value) {
            return transactionsForActiveAddress.value.filter(
                (tx) => tx.recipient !== STAKING_CONTRACT_ADDRESS && tx.sender !== STAKING_CONTRACT_ADDRESS,
            );
        }

        const searchStrings = options.searchString.value.toUpperCase().split(' ').filter((value) => value !== '');

        return transactionsForActiveAddress.value.filter((tx) => {
            // Skip staking and unstaking transactions
            if (tx.recipient === STAKING_CONTRACT_ADDRESS || tx.sender === STAKING_CONTRACT_ADDRESS) return false;

            const transaction = ref<Readonly<Transaction>>(tx);
            const { peerLabel, data } = useTransactionInfo(transaction);

            const senderLabel = addresses$.addressInfos[tx.sender]
                ? addresses$.addressInfos[tx.sender].label
                : getContactLabel.value(tx.sender) || AddressBook.getLabel(tx.sender) || '';

            const recipientLabel = addresses$.addressInfos[tx.recipient]
                ? addresses$.addressInfos[tx.recipient].label
                : getContactLabel.value(tx.recipient) || AddressBook.getLabel(tx.recipient) || '';

            const concatenatedTxStrings = `
                ${tx.sender.replace(/\s/g, '')}
                ${tx.recipient.replace(/\s/g, '')}
                ${peerLabel.value ? (peerLabel.value as string).toUpperCase() : ''}
                ${senderLabel ? senderLabel.toUpperCase() : ''}
                ${recipientLabel ? recipientLabel.toUpperCase() : ''}
                ${data.value.toUpperCase()}
                ${parseData(tx.data.raw).toUpperCase()}
            `;
            return searchStrings.every((searchString) => concatenatedTxStrings.includes(searchString));
        });
    });

    const transactions = computed(() => {
        // Display loading transactions
        if (!filteredTxs.value.length && isFetchingTxHistory.value && options.scrollerBuffer !== undefined) {
            // create just as many placeholders that the scroller doesn't start recycling them because the loading
            // animation breaks for recycled entries due to the animation delay being off.
            const listHeight = window.innerHeight - 220; // approximated to avoid enforced layouting by offsetHeight
            const placeholderCount = Math.floor((listHeight + options.scrollerBuffer) / itemSize.value);
            return [...new Array(placeholderCount)].map((e, i) => ({ transactionHash: i, loading: true }));
        }

        if (!filteredTxs.value.length) return [];

        const txs = filteredTxs.value;

        // Inject "This month" label
        const transactionsWithMonths: any[] = [];
        let isLatestMonth = true;

        const { month: currentMonth, year: currentYear } = processTimestamp(Date.now());
        let n = 0;
        let hasThisMonthLabel = false;

        if (txs[n].state === TransactionState.PENDING) {
            transactionsWithMonths.push({ transactionHash: $t('This month'), isLatestMonth });
            isLatestMonth = false;
            hasThisMonthLabel = true;
            while (txs[n] && txs[n].state === TransactionState.PENDING) {
                transactionsWithMonths.push(txs[n]);
                n++;
            }
        }

        let displayedMonthYear = `${currentMonth}.${currentYear}`;

        while (n < txs.length) {
            // Skip expired & invalidated txs
            if (!txs[n].timestamp) {
                transactionsWithMonths.push(txs[n]);
                n++;
                continue;
            }

            const { month: txMonth, year: txYear, date: txDate } = processTimestamp(toMs(txs[n].timestamp!));
            const txMonthYear = `${txMonth}.${txYear}`;

            if (!hasThisMonthLabel && txMonth === currentMonth && txYear === currentYear) {
                // Inject month + year labels and monthly rewards
                transactionsWithMonths.push({ transactionHash: $t('This month'), isLatestMonth });

                // Add monthly reward for current month if exists
                const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
                const currentMonthReward = monthlyRewards.value.get(currentMonthKey);
                if (currentMonthReward) {
                    transactionsWithMonths.push({
                        transactionHash: `monthly-reward-${currentMonthKey}`,
                        isMonthlyReward: true,
                        monthlyReward: currentMonthReward.total,
                        transactionCount: currentMonthReward.count,
                    });
                }

                hasThisMonthLabel = true;
                isLatestMonth = false;
            } else if (txMonthYear !== displayedMonthYear) {
                // First inject the month label
                transactionsWithMonths.push({
                    transactionHash: getLocaleMonthStringFromDate(
                        txDate,
                        locale,
                        {
                            month: 'long',
                            year: txYear !== currentYear ? 'numeric' : undefined,
                        },
                    ),
                    isLatestMonth,
                });

                // Then immediately inject the monthly reward summary if there were rewards
                const monthKey = `${txYear}-${String(txMonth + 1).padStart(2, '0')}`;
                const monthlyReward = monthlyRewards.value.get(monthKey);
                if (monthlyReward) {
                    transactionsWithMonths.push({
                        transactionHash: `monthly-reward-${monthKey}`,
                        isMonthlyReward: true,
                        monthlyReward: monthlyReward.total,
                        transactionCount: monthlyReward.count,
                    });
                }

                isLatestMonth = false;
                displayedMonthYear = txMonthYear;
            }

            transactionsWithMonths.push(txs[n]);
            n++;
        }

        return transactionsWithMonths;
    });

    return {
        transactions,
        filteredTxs,
        itemSize,
    };
}
