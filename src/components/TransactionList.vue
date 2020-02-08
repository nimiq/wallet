<template>
    <div class="transaction-list" ref="targetNode">
        <RecycleScroller
            v-if="isFetchingTxHistory || transactions.length"
            :items="transactions"
            :item-size="80"
            key-field="transactionHash"
            v-slot="{ item, index, active }"
            :buffer="200"
        >
            <div class="list-element loading" v-if="item.loading">
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
import { createComponent, computed, ref, Ref, onMounted, onBeforeUnmount } from '@vue/composition-api'
import { useAddressStore } from '../stores/Address'
import { useTransactionsStore } from '../stores/Transactions'
import { useNetworkStore } from '../stores/Network'
import TransactionListItem from '@/components/TransactionListItem.vue'

function getImage() {
    const images = [
        'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/contemplating_8t0x.svg',
        'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/mobile_user_7oqo.svg',
        'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/Tree_swing_646s.svg',
        'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/a_moment_to_relax_bbpa.svg',
        'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/yoga_248n.svg',
        'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/into_the_night_vumi.svg',
    ]

    return images[Math.floor(Math.random() * images.length)]
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
    }
) {
    return new Intl.DateTimeFormat(locale, options).format(date);
}

function getCloserElement(element: any, classToFind: string) {
    let e = element as HTMLElement;

    if (!e) {
        throw new Error('element undefined');
    }
    if (e.querySelector('.' + classToFind)) {
        while (!e.classList.contains(classToFind)) {
            e = e.childNodes[0] as HTMLElement;
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

        let oldActiveAddress = activeAddress.value;
        const transactions: any = computed(() => {
            // filtering & sorting TX
            let transactions = Object.values(transactions$.transactions)
                .filter(tx => {
                    let bool = (tx.sender === activeAddress.value || tx.recipient === activeAddress.value);

                    if (props.searchString !== '') {
                        bool = bool && tx.recipient.toUpperCase().includes(props.searchString.toUpperCase());
                    }
                    return bool;
                })
                .sort((a, b) => (b.timestamp || Number.MAX_SAFE_INTEGER) - (a.timestamp || Number.MAX_SAFE_INTEGER));

            // loading transactions
            if (!transactions.length && isFetchingTxHistory.value) {
                return [...new Array(20)].map((item, index) => ({ transactionHash: index, loading: true }));
            }

            // add month / "This month" / pending TX labels
            const transactionsWithMonths: any = [];
            if (!transactions.length) return transactionsWithMonths;

            let { month: currentTxMonth, year: currentYear } = processTimestamp(Date.now());
            let n = 0;

            if (!transactions[n].timestamp) {
                transactionsWithMonths.push({ transactionHash: context.root.$t("Pending...") });
                while (!transactions[n].timestamp) {
                    transactionsWithMonths.push(transactions[n]);
                    n++;
                }
            }

            let { month: txMonth, year: txYear } = processTimestamp(transactions[n].timestamp!*1000);

            if (txMonth === currentTxMonth && txYear === currentYear) {
                transactionsWithMonths.push({ transactionHash: context.root.$t("This month") });
            }

            const len = transactions.length;
            while (n < len) {
                let {
                    month: txMonth,
                    year: txYear,
                    date: txDate,
                } = processTimestamp(transactions[n].timestamp!*1000);

                if (txYear !== currentYear && txMonth !== currentTxMonth) {
                    transactionsWithMonths.push({
                        transactionHash: getLocaleMonthStringFromDate(
                            txDate,
                            context.root.$i18n.locale,
                            { month: "long", year: "numeric" },
                        ),
                    });
                } else if (txMonth !== currentTxMonth) {
                    transactionsWithMonths.push({
                        transactionHash: getLocaleMonthStringFromDate(
                            txDate,
                            context.root.$i18n.locale,
                            { month: "long" },
                        )
                    });
                }

                currentTxMonth = txMonth;
                transactionsWithMonths.push(transactions[n]);
                n++;
            }

            return transactionsWithMonths;
        });

        const loadingImageSrc = 'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/loading_frh4.svg';

        // listening for DOM changes for animations in the virtual scroll
        let targetNode: Ref<null | HTMLElement> = ref(null);
        (() => {
            'use strict';
            const config = { characterData: true, childList: true, subtree: true };
            const onAnimationEnd = (e: any) => {
                e.target!.removeEventListener('animationend', onAnimationEnd);
                e.target!.classList.remove('fadein');
            };
            const callback = async function(mutationsList: MutationRecord[], observer: MutationObserver) {
                if (!transactions.value.length) return;

                for (let mutation of mutationsList) {
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

            onMounted(() => observer.observe(targetNode.value!, config));
            onBeforeUnmount(() => observer.disconnect());
        })();

        return {
            transactions,
            getImage,
            loadingImageSrc,
            targetNode,
            isFetchingTxHistory,
        }
    },
    components: {
        TransactionListItem,
    } as any,
})
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.transaction-list {
    width: 90rem;
    display: flex; // ensure the scroller does not extend over our height but scrolls instead
    flex-direction: column;

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

    @for $i from 1 through 20 {
        .vue-recycle-scroller__item-view:nth-child(#{$i}) .placeholder {
            animation-delay: #{$i * 100}ms;
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
