<template>
    <DynamicScroller
        v-if="transactions.length"
        class="transaction-list"
        :items="transactions"
        key-field="transactionHash"
        v-slot="{ item, index, active }"
        :minItemSize="60"
    >
        <DynamicScrollerItem
            :item="item"
            :active="active"
        >
            <div class="month-label" v-if="!item.sender">{{ item.transactionHash }}</div>
            <TransactionListItem v-else :transaction="item"/>
        </DynamicScrollerItem>
    </DynamicScroller>

    <div v-else class="transaction-list text-center my-12">
        <img :src="getImage()">
        <span class="opacity-75">{{ $t('This is a quiet place with no transactions.') }}</span>
        <!-- <div v-else-if="transactions.length >= 10" class="text-center my-6">
            <span class="opacity-50">{{ $t('History is currently limited for performance.')}}</span>
        </div> -->
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api'
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

            return transactionsWithMonths;
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

        return {
            transactions,
            getImage,
            loadingImageSrc,
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

    .month-label {
        color: var(--nimiq-blue);
        letter-spacing: 1.5px;
        font-size: 1.75rem;
        height: 9rem;
        line-height: 9rem;
        text-transform: uppercase;
        font-weight: bold;
        padding-left: 2rem;
        opacity: 0.4;
        user-select: none;
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
