<template>
    <div class="transaction-list" ref="$el">
        <RecycleScroller
            v-if="isFetchingTxHistory || transactions.length"
            :items="transactions"
            :item-size="itemSize"
            key-field="transactionHash"
            v-slot="{ item, index }"
            :buffer="scrollerBuffer"
        >
            <div class="list-element loading" v-if="item.loading" :style="{ animationDelay: `${index * .1}s` }">
                <div class="date">
                    <div class="placeholder"></div>
                    <div class="placeholder"></div>
                </div>
                <div class="identicon placeholder">
                </div>
                <div class="data placeholder"></div>
            </div>
            <div class="list-element" v-else>
                <div class="month-label" v-if="!item.sender">{{ item.transactionHash }}</div>
                <TransactionListItem v-else :transaction="item"/>
            </div>
        </RecycleScroller>
        <div v-else class="text-center my-12">
            <img :src="getImage()">
            <span class="opacity-75">{{ $t('This is a quiet place with no transactions.') }}</span>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, computed, ref, Ref, onMounted, onBeforeUnmount } from '@vue/composition-api';
import TransactionListItem from '@/components/TransactionListItem.vue';
import { useAddressStore } from '../stores/Address';
import { useTransactionsStore } from '../stores/Transactions';
import { useNetworkStore } from '../stores/Network';

function getImage() {
    const basePath = 'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/';
    const images = [
        `${basePath}contemplating_8t0x.svg`,
        `${basePath}mobile_user_7oqo.svg`,
        `${basePath}Tree_swing_646s.svg`,
        `${basePath}a_moment_to_relax_bbpa.svg`,
        `${basePath}yoga_248n.svg`,
        `${basePath}into_the_night_vumi.svg`,
    ];

    return images[Math.floor(Math.random() * images.length)];
}

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

function getCloserElement(element: any, classToFind: string) {
    let e = element as HTMLElement;

    if (!e) {
        throw new Error('element undefined');
    }
    if (e.querySelector(`.${classToFind}`)) {
        while (!e.classList.contains(classToFind)) {
            e = e.children[0] as HTMLElement;
        }
    } else if (!e.classList.contains(classToFind)) {
        while (!e.classList.contains(classToFind)) {
            e = e.parentNode as HTMLElement;
        }
    }

    return e;
}

export default createComponent({
    props: {
        searchString: {
            type: String,
            default: '',
        },
    },
    setup(props, context) {
        const { activeAddress } = useAddressStore();
        const { state: transactions$ } = useTransactionsStore();
        const { isFetchingTxHistory } = useNetworkStore();

        const scrollerBuffer = 300;
        const itemSize = 80;

        const transactions: any = computed(() => {
            // filtering & sorting TX
            const txs = Object.values(transactions$.transactions)
                .filter((tx) => {
                    let bool = (tx.sender === activeAddress.value || tx.recipient === activeAddress.value);

                    if (props.searchString !== '') {
                        bool = bool && tx.recipient.toUpperCase().includes(props.searchString.toUpperCase());
                    }
                    return bool;
                })
                .sort((a, b) => (b.timestamp || Number.MAX_SAFE_INTEGER) - (a.timestamp || Number.MAX_SAFE_INTEGER));

            // loading transactions
            if (!txs.length && isFetchingTxHistory.value) {
                // create just as many placeholders that the scroller doesn't start recycling them because the loading
                // animation breaks for recycled entries due to the animation delay being off.
                const listHeight = window.innerHeight - 220; // approximated to avoid enforced layouting by offsetHeight
                const placeholderCount = Math.floor((listHeight + scrollerBuffer) / itemSize);
                return [...new Array(placeholderCount)].map((e, i) => ({ transactionHash: i, loading: true }));
            }

            // add month / "This month" / pending TX labels
            const transactionsWithMonths: any = [];
            if (!txs.length) return transactionsWithMonths;

            let { month: currentTxMonth, year: currentYear } = processTimestamp(Date.now());
            let n = 0;

            if (!txs[n].timestamp) {
                transactionsWithMonths.push({ transactionHash: context.root.$t('Pending...') });
                while (!txs[n].timestamp) {
                    transactionsWithMonths.push(txs[n]);
                    n++;
                }
            }

            let { month: txMonth, year: txYear } = processTimestamp(txs[n].timestamp! * 1000);
            let txDate: Date;

            if (txMonth === currentTxMonth && txYear === currentYear) {
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

        const loadingImageSrc = 'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/'
            + 'illustrations/loading_frh4.svg';

        // listening for DOM changes for animations in the virtual scroll
        // TODO reconsider whether we actually want to have this animation. If so, fix it such that the animation
        // doesn't rerun on fiatValue update.
        const $el: Ref<null | HTMLElement> = ref(null);
        (() => {
            const config = { characterData: true, childList: true, subtree: true };
            const onAnimationEnd = (e: any) => {
                e.target!.removeEventListener('animationend', onAnimationEnd);
                e.target!.classList.remove('fadein');
            };
            const callback = async function mutationCallback(mutationsList: MutationRecord[]) {
                if (!transactions.value.length) return;

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

                    if (element) {
                        element.classList.add('fadein');
                        element.addEventListener('animationend', onAnimationEnd);
                    }
                }
            };

            const observer = new MutationObserver(callback);

            onMounted(() => observer.observe($el.value!, config));
            onBeforeUnmount(() => observer.disconnect());
        })();

        return {
            scrollerBuffer,
            itemSize,
            transactions,
            getImage,
            loadingImageSrc,
            $el,
            isFetchingTxHistory,
        };
    },
    components: {
        TransactionListItem,
    } as any,
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.transaction-list {
    position: relative;

    .month-label {
        color: var(--nimiq-blue);
        letter-spacing: 1.5px;
        font-size: 1.75rem;
        height: 10rem;
        line-height: 10rem;
        text-transform: uppercase;
        font-weight: bold;
        padding-left: 2rem;
        opacity: 0.4;
        user-select: none;
    }

    .vue-recycle-scroller {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        @media (min-width: 426px) {
            $nimiqBlue: #1f2348;

            /* width */
            &::-webkit-scrollbar {
                width: 6px;
            }

            /* Track */
            &::-webkit-scrollbar-track {
                background: rgba($nimiqBlue, 0.2);
            }

            /* Handle */
            &::-webkit-scrollbar-thumb {
                background: rgba($nimiqBlue, 0.6);
                border-radius: 6px;
            }

            /* Handle on hover */
            &::-webkit-scrollbar-thumb:hover {
                background: rgba($nimiqBlue, 0.8);
            }
        }

    }

    .list-element {
        position: relative;
        background-color: white;

        &.fadein {
            animation-name: fadein;
            animation-duration: 250ms;
            animation-iteration-count: 1;

            @keyframes fadein {
                0% {
                    opacity: 0;
                    transform: translateX(-2rem);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
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
                background-color: var(--nimiq-gray);
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
}

img {
    max-width: 55rem;
    margin: 0 20rem 4rem;
    display: block;
}

.text-center {
    text-align: center;
}

.opacity-75 {
    opacity: 0.75;
}

</style>
