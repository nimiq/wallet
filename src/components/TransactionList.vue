<template>
    <div class="transaction-list flex-row" ref="$el">
        <RecycleScroller
            v-if="isFetchingTxHistory || transactions.length"
            :items="transactions"
            :item-size="itemSize"
            key-field="transactionHash"
            :buffer="scrollerBuffer"
        >
            <template v-if="showUnclaimedCashlinkList" v-slot:before>
                <div class="unclaimed-cashlink-list">
                    <CloseButton class="top-right" @click="$emit('close-unclaimed-cashlink-list')"/>
                    <div class="month-label nq-orange">{{ $t('Pending Cashlinks') }}</div>
                    <TransactionListItem
                        v-for="tx in unclaimedCashlinkTxs"
                        :transaction="tx"
                        :key="tx.transactionHash"
                    />
                </div>
            </template>

            <template v-slot:default="{ item, index }">
                <div
                    class="list-element loading"
                    v-if="item.loading"
                    :style="{ animationDelay: `${index * .1}s` }"
                >
                    <div class="date">
                        <div class="placeholder"></div>
                        <div class="placeholder"></div>
                    </div>
                    <div class="identicon placeholder">
                    </div>
                    <div class="data placeholder"></div>
                </div>
                <div v-else class="list-element" :data-id="index" :data-hash="item.transactionHash">
                    <div class="month-label" v-if="!item.sender">{{ item.transactionHash }}</div>
                    <TransactionListItem v-else :transaction="item"/>
                </div>
            </template>

            <template v-if="transactions.length === 2 /* 1 label + 1 tx */" v-slot:after>
                <div class="after-first-tx">
                    <h1 class="nq-h1">{{ $t('Congrats') }} 🎉</h1>
                    <h1 class="nq-h1">{{ $t('You now own crypto!') }}</h1>
                    <p class="nq-text">
                        {{ $t('Invite a friend with a') }}
                        <a href="#cashlink" @click.prevent="onCreateCashlink">{{ $t('Cashlink') }}</a>
                        {{ $t('or visit an exchange and get more.') }}
                    </p>
                    <a href="https://nimiq.com/exchanges" target="_blank" class="nq-button light-blue">
                        {{ $t('Buy NIM') }}
                    </a>
                </div>
            </template>
        </RecycleScroller>

        <div v-else-if="!searchString" class="empty-state flex-column">
            <h2 class="nq-h1">{{ $t('Your transactions will appear here') }}</h2>
            <span>{{ $t('Receive some free NIM to get started.') }}</span>

            <a v-if="isMainnet" href="https://getsome.nimiq.com" class="nq-button light-blue">
                {{ $t('Receive free NIM') }}
            </a>
            <TestnetFaucet v-else :address="activeAddress" :key="activeAddress"/>
        </div>
        <div v-else class="empty-state flex-column">
            <h2 class="nq-h1 no-search-results">{{ $t('No transactions found') }}</h2>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, Ref, onMounted, onBeforeUnmount, watch } from '@vue/composition-api';
import { CloseButton } from '@nimiq/vue-components';
import { AddressBook } from '@nimiq/utils';
import TransactionListItem from '@/components/TransactionListItem.vue';
import TestnetFaucet from './TestnetFaucet.vue';
import { useAddressStore } from '../stores/Address';
import { useTransactionsStore, Transaction } from '../stores/Transactions';
import { useContactsStore } from '../stores/Contacts';
import { useNetworkStore } from '../stores/Network';
import { parseData } from '../lib/DataFormatting';
import { MAINNET_ORIGIN } from '../lib/Constants';
import { isFundingCashlink } from '../lib/CashlinkDetection';
import { createCashlink } from '../hub';
import { useWindowSize } from '../composables/useWindowSize';

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
        month?: string,
        year?: string,
    },
) {
    return new Intl.DateTimeFormat(locale, options).format(date);
}

function getCloserElement(element: any, classToFind: string): HTMLElement {
    let e = element as HTMLElement;

    if (!e) throw new Error('element undefined');

    const selector = `.${classToFind}`;

    if (e.matches(selector)) return e;

    const child = e.querySelector(`.${classToFind}`) as HTMLElement;
    if (child) return child;

    while (e && !e.matches(selector)) {
        e = e.parentNode as HTMLElement;
    }
    return e;
}

export default defineComponent({
    props: {
        searchString: {
            type: String,
            default: '',
        },
        showUnclaimedCashlinkList: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const { activeAddress, state: addresses$, activeAddressInfo } = useAddressStore();
        const { state: transactions$ } = useTransactionsStore();
        const { isFetchingTxHistory } = useNetworkStore();
        const { getLabel: getContactLabel } = useContactsStore();

        // Amount of pixel to add to edges of the scrolling visible area to start rendering items further away
        const scrollerBuffer = 300;

        // Height of items in pixel
        const { width: windowWidth } = useWindowSize();
        const itemSize = computed(() => windowWidth.value > 700 // Full mobile breakpoint
            ? 72
            : 68, // 64px + 4px margin between items
        );

        // Get all transactions for the active address
        const txsForActiveAddress = computed(() => Object.values(transactions$.transactions)
            .filter((tx) => tx.sender === activeAddress.value || tx.recipient === activeAddress.value));

        const unclaimedCashlinkTxs = computed(() => txsForActiveAddress.value
            .filter((tx) =>
                tx.sender === activeAddress.value && !tx.relatedTransactionHash && isFundingCashlink(tx.data.raw))
            .slice(0).sort((a, b) =>
                (b.timestamp || Number.MAX_SAFE_INTEGER) - (a.timestamp || Number.MAX_SAFE_INTEGER)));

        // Count unclaimed cashlinks
        watch(() => {
            const count = unclaimedCashlinkTxs.value.length;
            context.emit('unclaimed-cashlink-count', count);
        });

        // Apply search filter
        const filteredTxs = computed(() => {
            if (!props.searchString) return txsForActiveAddress.value;

            const searchStrings = props.searchString.toUpperCase().split(' ').filter((value) => value !== '');

            return txsForActiveAddress.value.filter((tx) => {
                const senderLabel = addresses$.addressInfos[tx.sender]
                    ? addresses$.addressInfos[tx.sender].label
                    : getContactLabel.value(tx.sender) || AddressBook.getLabel(tx.sender) || '';

                const recipientLabel = addresses$.addressInfos[tx.recipient]
                    ? addresses$.addressInfos[tx.recipient].label
                    : getContactLabel.value(tx.recipient) || AddressBook.getLabel(tx.recipient) || '';

                const concatenatedTxStrings = `
                    ${tx.sender.replace(/\s/g, '')}
                    ${tx.recipient.replace(/\s/g, '')}
                    ${senderLabel ? senderLabel.toUpperCase() : ''}
                    ${recipientLabel ? recipientLabel.toUpperCase() : ''}
                    ${parseData(tx.data.raw).toUpperCase()}
                `;
                return searchStrings.every((searchString) => concatenatedTxStrings.includes(searchString));
            });
        });

        const transactions = computed(() => {
            // Display loading transactions
            if (!filteredTxs.value.length && isFetchingTxHistory.value) {
                // create just as many placeholders that the scroller doesn't start recycling them because the loading
                // animation breaks for recycled entries due to the animation delay being off.
                const listHeight = window.innerHeight - 220; // approximated to avoid enforced layouting by offsetHeight
                const placeholderCount = Math.floor((listHeight + scrollerBuffer) / itemSize.value);
                return [...new Array(placeholderCount)].map((e, i) => ({ transactionHash: i, loading: true }));
            }

            if (!filteredTxs.value.length) return [];

            // Sort transactions by descending timestamp
            const txs = filteredTxs.value.slice(0).sort((a, b) =>
                (b.timestamp || Number.MAX_SAFE_INTEGER) - (a.timestamp || Number.MAX_SAFE_INTEGER));

            // Inject "This month" label
            const transactionsWithMonths: any[] = [];

            let { month: currentTxMonth, year: currentYear } = processTimestamp(Date.now());
            let n = 0;
            let hasThisMonthLabel = false;

            if (!txs[n].timestamp) {
                transactionsWithMonths.push({ transactionHash: context.root.$t('This month') });
                hasThisMonthLabel = true;
                while (txs[n] && !txs[n].timestamp) {
                    transactionsWithMonths.push(txs[n]);
                    n++;
                }
            }

            if (!txs[n]) return transactionsWithMonths; // Address has only pending txs

            // Inject month + year labels
            let { month: txMonth, year: txYear } = processTimestamp(txs[n].timestamp! * 1000);
            let txDate: Date;

            if (!hasThisMonthLabel && txMonth === currentTxMonth && txYear === currentYear) {
                transactionsWithMonths.push({ transactionHash: context.root.$t('This month') });
            }

            const len = txs.length;
            while (n < len) {
                ({ month: txMonth, year: txYear, date: txDate } = processTimestamp(txs[n].timestamp! * 1000));

                if (txYear !== currentYear && txMonth !== currentTxMonth) {
                    transactionsWithMonths.push({
                        transactionHash: getLocaleMonthStringFromDate(
                            txDate,
                            context.root.$i18n.locale,
                            { month: 'long', year: 'numeric' },
                        ),
                    });
                } else if (txMonth !== currentTxMonth) {
                    transactionsWithMonths.push({
                        transactionHash: getLocaleMonthStringFromDate(
                            txDate,
                            context.root.$i18n.locale,
                            { month: 'long' },
                        ),
                    });
                }

                currentTxMonth = txMonth;
                transactionsWithMonths.push(txs[n]);
                n++;
            }

            return transactionsWithMonths;
        });

        // listening for DOM changes for animations in the virtual scroll
        // TODO reconsider whether we actually want to have this animation. If so, fix it such that the animation
        // only runs on transaction hash change.
        const $el: Ref<null | HTMLElement> = ref(null);
        (() => {
            let txHashList = transactions.value.map((tx: Transaction) => tx.transactionHash + activeAddress.value);
            const config = { characterData: true, childList: true, subtree: true };
            const callback = async function mutationCallback(mutationsList: MutationRecord[]) {
                if (!transactions.value.length) return;
                const changedIndexes: string[] = [];

                for (const mutation of mutationsList) {
                    let element: null | HTMLElement = null;

                    if (mutation.target) {
                        if (
                            mutation.type === 'childList'
                            && !(mutation.target as HTMLElement).classList.contains('transaction-list')
                            && !(mutation.target as HTMLElement).classList.contains('resize-observer')
                        ) {
                            element = getCloserElement(mutation.target, 'list-element');
                        } else if (
                            mutation.type === 'characterData'
                            && mutation.target.parentNode
                        ) {
                            element = getCloserElement(mutation.target.parentNode, 'list-element');
                        }
                    }

                    if (element && !changedIndexes.includes(element.dataset.id!)) {
                        changedIndexes.push(element.dataset.id!);

                        const changedTxHash = element.dataset.hash as string;

                        if (!txHashList.includes(changedTxHash + activeAddress.value)) { // added element
                            txHashList.push(changedTxHash + activeAddress.value);
                            element.classList.remove('fadein');
                            requestAnimationFrame(() => element!.classList.add('fadein'));
                        }
                    }
                }

                txHashList = transactions.value.map((tx: Transaction) => tx.transactionHash + activeAddress.value);
            };

            const observer = new MutationObserver(callback);

            onMounted(() => observer.observe($el.value!, config));
            onBeforeUnmount(() => observer.disconnect());
        })();

        const isMainnet = window.location.origin === MAINNET_ORIGIN;

        function onCreateCashlink() {
            createCashlink(activeAddress.value!, activeAddressInfo.value!.balance || undefined);
        }

        return {
            activeAddress,
            scrollerBuffer,
            itemSize,
            transactions,
            $el,
            isFetchingTxHistory,
            isMainnet,
            unclaimedCashlinkTxs,
            onCreateCashlink,
        };
    },
    components: {
        TransactionListItem,
        TestnetFaucet,
        CloseButton,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.transaction-list {
    position: relative;
}

.month-label {
    letter-spacing: 1.5px;
    font-size: var(--label-size);
    padding-top: 5rem; // Padding-top +
    line-height: 2rem; // Line-height +
    padding-bottom: 2rem; // Padding-bottom = 9rem, equal to a transaction height
    text-transform: uppercase;
    font-weight: bold;
    padding-left: 2rem;
    opacity: 0.4;
}

.vue-recycle-scroller {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    padding-right: calc(2rem + var(--padding) - 6px);
    padding-left: calc(2rem + var(--padding));
    padding-bottom: var(--padding, 4rem);

    @extend %custom-scrollbar;
}

.unclaimed-cashlink-list {
    border: 0.25rem solid rgba(252, 135, 2, 0.3); // Based on Nimiq Orange
    border-radius: 0.5rem;
    padding: 2rem;
    position: relative;
    margin: 0 -2rem;

    .month-label {
        opacity: 1;
        padding-top: 1rem;
    }
}

.list-element {
    position: relative;

    &.fadein {
        animation-name: fadein;
        animation-duration: 250ms;
        animation-iteration-count: 1;

        @keyframes fadein {
            0% { opacity: 0 }
            100% { opacity: 1 }
        }
    }

    &.loading {
        cursor: progress;
        height: 10rem;
        padding: 2rem 1rem;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;

        .placeholder {
            background-color: var(--text-10);
            border-radius: 1rem;

            animation-name: loading;
            animation-duration: 1s;
            animation-iteration-count: infinite;
            animation-delay: inherit;

            @keyframes loading {
                0% { opacity: 1 }
                50% { opacity: .5 }
                100% { opacity: 1 }
            }
        }

        .date {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            margin-left: 1rem;
            margin-right: 1.25rem;
            height: 5rem;
            animation-delay: inherit;

            .placeholder {
                height: 2rem;
                width: 3rem;
            }
        }
        .identicon {
            margin: 0 1rem;
            height: 6rem;
            width: 6rem;
        }
        .data {
            flex-grow: 1;
            margin: 0 1rem;
            height: 22px;
            align-self: flex-start;
            max-width: 50%;
        }
    }
}

.after-first-tx {
    width: 37rem;
    max-width: 100%;
    margin: 16rem auto 0;
    text-align: center;

    .nq-h1:nth-child(2) {
        margin-top: -2.5rem;
        margin-bottom: 2rem;
    }

    .nq-text {
        color: var(--text-60);
        font-weight: 600;
        margin-bottom: 1rem;

        a {
            color: inherit;
            text-decoration: underline;
        }
    }
}

.empty-state {
    width: 100%;
    justify-content: center;
    align-items: center;

    .nq-h1 {
        margin-top: 0;
        margin-bottom: 1.5rem;
    }

    span {
        font-size: var(--body-size);
        font-weight: 600;
        opacity: 0.6;
    }

    .testnet-faucet,
    > .nq-button {
        margin-top: 4.5rem;
    }

    .no-search-results {
        opacity: 0.4;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .month-label {
        padding-top: 4rem;
    }

    .vue-recycle-scroller {
        padding-right: calc(0.25rem + var(--padding));
        padding-left: calc(0.25rem + var(--padding));
    }

    .after-first-tx {
        margin-top: 6rem;
    }

    .unclaimed-cashlink-list {
        padding: 0.5rem;
        margin: 0;

        .top-right {
            top: 1rem;
            right: 1rem;
        }
    }

    .empty-state {
        margin: 0 2rem;

        .nq-h1 {
            font-size: 2.5rem;
            text-align: center;
        }

        .testnet-faucet,
        > .nq-button {
            margin-top: 2.5rem;
        }
    }
}
</style>
