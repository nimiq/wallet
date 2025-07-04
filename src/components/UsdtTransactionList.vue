<template>
    <div class="transaction-list flex-row" ref="root">
        <RecycleScroller
            v-if="isFetchingUsdtTxHistory || transactions.length"
            :items="transactions"
            :item-size="itemSize"
            key-field="transactionHash"
            :buffer="scrollerBuffer"
            ref="scroller"
        >
            <template v-slot:default="{ item, index }">
                <div
                    class="list-element loading"
                    v-if="item.loading"
                    :style="{ animationDelay: `${index * .1}s` }"
                >
                    <div class="date flex-column">
                        <div class="placeholder"></div>
                        <div class="placeholder"></div>
                    </div>
                    <HexagonIcon class="identicon"/>
                    <div class="data flex-column">
                        <div class="placeholder"></div>
                        <div class="placeholder"></div>
                    </div>
                    <div class="amounts flex-column">
                        <div class="placeholder"></div>
                        <div class="placeholder"></div>
                    </div>
                </div>
                <div v-else class="list-element" :data-id="index" :data-hash="item.transactionHash">
                    <div v-if="!item.sender" class="month-label flex-row">
                        <label>{{ item.transactionHash }}</label>
                        <div v-if="item.isLatestMonth && isFetchingUsdtTxHistory" class="fetching flex-row">
                            <CircleSpinner/>
                            <span>{{ $t('Fetching') }}</span>
                        </div>
                    </div>
                    <UsdtTransactionListItem v-else :transaction="item"/>
                </div>
            </template>

            <template v-if="txCount === 1" v-slot:after>
                <div class="after-first-tx">
                    <h1 class="nq-h1">{{ $t('Congrats') }} 🎉</h1>
                    <h1 class="nq-h1">{{ $t('You now own crypto!') }}</h1>
                    <router-link to="buy" class="nq-button light-blue">
                        {{ $t('Buy USDT') }}
                    </router-link>
                </div>
            </template>
        </RecycleScroller>

        <div v-else-if="!searchString" class="empty-state flex-column">
            <h2 class="nq-h1">{{ $t('Your transactions will appear here') }}</h2>

            <router-link v-if="isMainnet" to="buy" class="nq-button light-blue">
                {{ $t('Buy USDT') }}
            </router-link>
        </div>
        <div v-else class="empty-state flex-column">
            <h2 class="nq-h1 no-search-results">{{ $t('No transactions found') }}</h2>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, Ref, watch, onMounted, onUnmounted } from 'vue';
import { CircleSpinner, HexagonIcon } from '@nimiq/vue-components';
import UsdtTransactionListItem from '@/components/UsdtTransactionListItem.vue';
import { useI18n } from '@/lib/useI18n';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { useUsdtTransactionsStore, Transaction, TransactionState } from '../stores/UsdtTransactions';
import { useUsdtContactsStore } from '../stores/UsdtContacts';
import { usePolygonNetworkStore } from '../stores/PolygonNetwork';
import { ENV_MAIN } from '../lib/Constants';
import { useConfig } from '../composables/useConfig';
import { useWindowSize } from '../composables/useWindowSize';
import { useUsdtTransactionInfo } from '../composables/useUsdtTransactionInfo';

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

// function getCloserElement(element: any, classToFind: string): HTMLElement {
//     let e = element as HTMLElement;
//
//     if (!e) throw new Error('element undefined');
//
//     const selector = `.${classToFind}`;
//
//     if (e.matches(selector)) return e;
//
//     const child = e.querySelector(`.${classToFind}`) as HTMLElement;
//     if (child) return child;
//
//     while (e && !e.matches(selector)) {
//         e = e.parentNode as HTMLElement;
//     }
//     return e;
// }

export default defineComponent({
    props: {
        searchString: {
            type: String,
            default: '',
        },
    },
    setup(props, context) {
        const { $t, locale } = useI18n();
        const { addressInfo } = usePolygonAddressStore();
        const { state: transactions$ } = useUsdtTransactionsStore();
        const { isFetchingUsdtTxHistory } = usePolygonNetworkStore();
        const { getLabel: getContactLabel } = useUsdtContactsStore();
        const { config } = useConfig();

        const activeAddress = computed(() => addressInfo.value?.address);

        // Amount of pixel to add to edges of the scrolling visible area to start rendering items further away
        const scrollerBuffer = 300;

        // Height of items in pixel
        const { isMobile } = useWindowSize();
        const itemSize = computed(() => isMobile.value ? 68 : 72); // mobile: 64px + 4px margin between items

        // Get all transactions for the active address
        const txsForActiveAddress = computed(() => Object.values(transactions$.transactions)
            .filter((tx) => tx.sender === activeAddress.value || tx.recipient === activeAddress.value));

        const txCount = computed(() => txsForActiveAddress.value.length);

        // Apply search filter
        const filteredTxs = computed(() => {
            if (!props.searchString) return txsForActiveAddress.value;

            const searchStrings = props.searchString.toUpperCase().split(' ').filter((value) => value !== '');

            return txsForActiveAddress.value.filter((tx) => {
                const transaction = ref<Readonly<Transaction>>(tx);
                const { peerLabel, data } = useUsdtTransactionInfo(transaction);

                const senderLabel = getContactLabel.value(tx.sender) || '';

                const recipientLabel = getContactLabel.value(tx.recipient) || '';

                const concatenatedTxStrings = `
                    ${tx.sender.replace(/\s/g, '')}
                    ${tx.recipient.replace(/\s/g, '')}
                    ${peerLabel.value ? (peerLabel.value as string).toUpperCase() : ''}
                    ${data.value ? (data.value as string).toUpperCase() : ''}
                    ${senderLabel.toUpperCase()}
                    ${recipientLabel.toUpperCase()}
                `;
                return searchStrings.every((searchString) => concatenatedTxStrings.includes(searchString));
            });
        });

        const transactions = computed(() => {
            // Display loading transactions
            if (!filteredTxs.value.length && isFetchingUsdtTxHistory.value) {
                // create just as many placeholders that the scroller doesn't start recycling them because the loading
                // animation breaks for recycled entries due to the animation delay being off.
                const listHeight = window.innerHeight - 220; // approximated to avoid enforced layouting by offsetHeight
                const placeholderCount = Math.floor((listHeight + scrollerBuffer) / itemSize.value);
                return [...new Array(placeholderCount)].map((e, i) => ({ transactionHash: i, loading: true }));
            }

            if (!filteredTxs.value.length) return [];

            // Sort transactions by descending timestamp
            const txs = filteredTxs.value.slice(0).sort((a, b) => {
                const aHeight = a.blockHeight || Number.MAX_SAFE_INTEGER;
                const bHeight = b.blockHeight || Number.MAX_SAFE_INTEGER;

                return bHeight - aHeight;
            });

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

            // Skip expired & invalidated txs
            while (txs[n] && !txs[n].timestamp) {
                transactionsWithMonths.push(txs[n]);
                n++;
            }

            if (!txs[n]) return transactionsWithMonths; // Address has no more txs

            // Inject month + year labels
            let { month: txMonth, year: txYear } = processTimestamp(txs[n].timestamp! * 1000);
            let txDate: Date;

            if (!hasThisMonthLabel && txMonth === currentMonth && txYear === currentYear) {
                transactionsWithMonths.push({ transactionHash: $t('This month'), isLatestMonth });
                isLatestMonth = false;
            }

            let displayedMonthYear = `${currentMonth}.${currentYear}`;

            while (n < txs.length) {
                // Skip expired & invalidated txs
                if (!txs[n].timestamp) {
                    transactionsWithMonths.push(txs[n]);
                    n++;
                    continue;
                }

                ({ month: txMonth, year: txYear, date: txDate } = processTimestamp(txs[n].timestamp! * 1000));
                const txMonthYear = `${txMonth}.${txYear}`;

                if (txMonthYear !== displayedMonthYear) {
                    // Inject a month label
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
                    isLatestMonth = false;
                    displayedMonthYear = txMonthYear;
                }

                transactionsWithMonths.push(txs[n]);
                n++;
            }

            return transactionsWithMonths;
        });

        // listening for DOM changes for animations in the virtual scroll
        // TODO reconsider whether we actually want to have this animation. If so, fix it such that the animation
        // only runs on transaction hash change.
        const root: Ref<null | HTMLElement> = ref(null);
        // (() => {
        //     let txHashList = transactions.value.map((tx: Transaction) => tx.transactionHash + activeAddress.value);
        //     const config = { characterData: true, childList: true, subtree: true };
        //     const callback = async function mutationCallback(mutationsList: MutationRecord[]) {
        //         if (!transactions.value.length) return;
        //         const changedIndexes: string[] = [];
        //
        //         for (const mutation of mutationsList) {
        //             let element: null | HTMLElement = null;
        //
        //             if (mutation.target) {
        //                 if (
        //                     mutation.type === 'childList'
        //                     && !(mutation.target as HTMLElement).classList.contains('transaction-list')
        //                     && !(mutation.target as HTMLElement).classList.contains('resize-observer')
        //                 ) {
        //                     element = getCloserElement(mutation.target, 'list-element');
        //                 } else if (
        //                     mutation.type === 'characterData'
        //                     && mutation.target.parentNode
        //                 ) {
        //                     element = getCloserElement(mutation.target.parentNode, 'list-element');
        //                 }
        //             }
        //
        //             if (element && !changedIndexes.includes(element.dataset.id!)) {
        //                 changedIndexes.push(element.dataset.id!);
        //
        //                 const changedTxHash = element.dataset.hash as string;
        //
        //                 if (!txHashList.includes(changedTxHash + activeAddress.value)) { // added element
        //                     txHashList.push(changedTxHash + activeAddress.value);
        //                     element.classList.remove('fadein');
        //                     requestAnimationFrame(() => element!.classList.add('fadein'));
        //                 }
        //             }
        //         }
        //
        //         txHashList = transactions.value.map((tx: Transaction) => tx.transactionHash + activeAddress.value);
        //     };
        //
        //     const observer = new MutationObserver(callback);
        //
        //     onMounted(() => observer.observe(root.value!, config));
        //     onBeforeUnmount(() => observer.disconnect());
        // })();

        // Does not need to be reactive, as the environment doesn't change during runtime.
        const isMainnet = config.environment === ENV_MAIN;

        // Scroll to top when
        // - Active address changes
        const scroller = ref<{
            scrollToPosition(position: number, smooth?: boolean): void,
            $el: HTMLDivElement,
                } | null>(null);

        watch(activeAddress, () => {
            if (scroller.value) {
                scroller.value.scrollToPosition(0, false); // No smooth scrolling on address change
            }
        });

        function onScroll() {
            context.emit('scroll');
        }

        // @scroll / @scroll.native doesn't seem to work, so using standard event system
        onMounted(() => {
            if (!scroller.value) return;
            scroller.value.$el.addEventListener('scroll', onScroll);
        });

        onUnmounted(() => {
            if (!scroller.value) return;
            scroller.value.$el.removeEventListener('scroll', onScroll);
        });

        return {
            activeAddress,
            scrollerBuffer,
            itemSize,
            txCount,
            transactions,
            root,
            isFetchingUsdtTxHistory,
            isMainnet,
            scroller,
        };
    },
    components: {
        UsdtTransactionListItem,
        CircleSpinner,
        HexagonIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.transaction-list {
    position: relative;
}

.month-label {
    padding: 5rem 2rem 2rem;
    justify-content: space-between;
    align-items: center;

    label {
        letter-spacing: 1.5px;
        font-size: var(--label-size);
        line-height: 2rem;
        text-transform: uppercase;
        font-weight: bold;
        opacity: 0.4;
    }
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

    touch-action: pan-y;

    @extend %custom-scrollbar;
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

        .placeholder,
        .identicon {
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

        .placeholder {
            background-color: var(--text-6);
            border-radius: 0.5rem;
        }

        .date,
        .data,
        .amounts {
            justify-content: space-between;
            height: 4.25rem;
            animation-delay: inherit;

            .placeholder {
                width: 100%;
                height: 1.875rem;
                max-width: 51rem;

                &:last-child {
                    height: 1rem;
                }
            }
        }

        .date {
            align-items: center;
            margin-left: 1rem;
            margin-right: 1.25rem;

            .placeholder {
                width: 2.25rem;

                &:last-child {
                    width: 3rem;
                }
            }
        }
        .identicon {
            margin: 0 1rem;
            height: 6rem;
            width: 6rem;
            color: var(--text-6);
        }
        .data {
            flex-grow: 1;
            margin: 0 5vw 0 1.5rem;

            .placeholder {
                &:last-child {
                    width: 30%;
                    min-width: 5rem;
                    max-width: 20rem;
                }
            }
        }
        .amounts {
            width: 8%;
            min-width: 8rem;
            align-items: flex-end;

            .placeholder {
                &:last-child {
                    width: 55%;
                }
            }
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
        text-align: center;
    }

    span {
        font-size: var(--body-size);
        font-weight: 600;
        opacity: 0.6;
    }

    > .nq-button {
        margin-top: 4.5rem;
    }

    .no-search-results {
        opacity: 0.4;
    }
}

.fetching {
    span {
        font-size: var(--small-size);
        opacity: 0.5;
        margin-left: 1rem;
        font-weight: 600;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
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

    .empty-state {
        margin: 0 2rem;

        .nq-h1 {
            font-size: 2.5rem;
            text-align: center;
        }

        > .nq-button {
            margin-top: 2.5rem;
        }
    }
}
</style>
