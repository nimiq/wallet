<template>

    <div
        v-if="transactions.length"
        class="transaction-list"
        ref="targetNode"
    >
        <RecycleScroller
            :items="transactions"
            :item-size="80"
            key-field="id"
            v-slot="{ item, index, active }"
            :buffer="200"
        >
            <div class="list-element fadein" :style="{}">
                <div class="month-label" v-if="!item.sender">{{ item.transactionHash }}</div>
                <TransactionListItem v-else :transaction="item"/>
            </div>
        </RecycleScroller>
    </div>

    <div v-else class="transaction-list text-center my-12">
        <img :src="getImage()">
        <span class="opacity-75">{{ $t('This is a quiet place with no transactions.') }}</span>
        <!-- <div v-else-if="transactions.length >= 10" class="text-center my-6">
            <span class="opacity-50">{{ $t('History is currently limited for performance.')}}</span>
        </div> -->
    </div>
</template>

<script lang="ts">
import { createComponent, computed, ref, Ref, onMounted, onBeforeUnmount } from '@vue/composition-api'
import { useAddressStore } from '../stores/Address'
import { useTransactionsStore } from '../stores/Transactions'
import { useNetworkStore } from '../stores/Network'
import TransactionListItem from '@/components/TransactionListItem.vue'

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

        const transactions: any = computed(() => {
            // filtering & sorting TX
            let transactions = Object.values(transactions$.transactions)
                .filter(tx => tx.sender === activeAddress.value || tx.recipient === activeAddress.value)
                .sort((a, b) => (b.timestamp || Number.MAX_SAFE_INTEGER) - (a.timestamp || Number.MAX_SAFE_INTEGER));

            if (props.searchString !== '') {
                transactions = transactions.filter((tx) =>
                    tx.recipient.toUpperCase().includes(props.searchString.toUpperCase())
                );

            }

            // add month labels / handle "This month" TX & pending TX
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

            return transactionsWithMonths.map((tx: any, index: number) => (tx.id = index, tx));
        });

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

        const loadingImageSrc = 'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/loading_frh4.svg'

        function el(element: any) {
            let e = element as HTMLElement;

            if (!e) {
                throw new Error('element undefined');
            }
            if (e.querySelector('.list-element')) {
                while (!e.classList.contains('list-element')) {
                    e = e.childNodes[0] as HTMLElement;
                }
            } else if (!e.classList.contains('list-element')) {
                while (!e.classList.contains('list-element')) {
                    e = e.parentNode as HTMLElement;
                }
            }

            return e;
        }

        let targetNode = ref(null);
        // Options for the observer (which mutations to observe)
        const config = { characterData: true, childList: true, subtree: true };

        // Callback function to execute when mutations are observed
        const callback = async function(mutationsList: MutationRecord[], observer: MutationObserver) {
            // Use traditional 'for loops' for IE 11
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.target && !mutation.removedNodes.length)  {
                    const element = el(mutation.target);
                    element.classList.remove('fadein');
                    requestAnimationFrame(() => element.classList.add('fadein'));
                } else if (mutation.type === 'characterData' && mutation.target && mutation.target.parentNode) {
                    const element = el(mutation.target.parentNode);
                    element.classList.remove('fadein');
                    requestAnimationFrame(() => element.classList.add('fadein'));
                }
            }
        };

        // Create an observer instance linked to the callback function
        const observer = new MutationObserver(callback);

        onMounted(() => observer.observe(targetNode.value!, config));
        onBeforeUnmount(() => observer.disconnect());

        return {
            transactions,
            getImage,
            loadingImageSrc,
            targetNode,
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
    overflow-y: auto;
    width: 90rem;

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
    }

    .list-element {
        position: relative;
        overflow: hidden;
        background-color: white;

        opacity: 0;
        transform: translateX(-2rem);

        &.fadein {
            opacity: 1;
            transform: translateX(0);

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

.opacity-50 {
    opacity: 0.5;
}

.opacity-75 {
    opacity: 0.75;
}

.my-6 {
    margin-top: 3rem;
    margin-bottom: 3rem;
}

.my-12 {
    margin-top: 6rem;
    margin-bottom: 6rem;
}
</style>
