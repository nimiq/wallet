<template>
    <RecycleScroller
        v-if="transactions.length"
        class="transaction-list"
        :items="transactions"
        :item-size="80"
        key-field="transactionHash"
        v-slot="{ item }"
    >
        <TransactionListItem :transaction="item"/>
    </RecycleScroller>

    <div v-else class="transaction-list">
        <div v-if="isFetchingTxHistory" class="text-center my-12">
            <img :src="loadingImageSrc">
            <span class="opacity-75">{{ $t('Fetching your transaction history...') }}</span>
        </div>
        <div v-else class="text-center my-12">
            <img :src="getImage()">
            <span class="opacity-75">{{ $t('This is a quiet place with no transactions.') }}</span>
        </div>
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

export default createComponent({
    setup() {
        const { activeAddress } = useAddressStore()
        const { state: transactions$ } = useTransactionsStore()


        const transactions = computed(() => Object.values(transactions$.transactions)
            .filter(tx => tx.sender === activeAddress.value || tx.recipient === activeAddress.value)
            .sort((a, b) => (b.timestamp || Number.MAX_SAFE_INTEGER) - (a.timestamp || Number.MAX_SAFE_INTEGER))
        )

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
