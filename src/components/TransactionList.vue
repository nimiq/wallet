<template>
    <div class="transaction-list">
        <div v-if="isFetchingTxHistory" class="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white inline-block rounded">Updating...</div>
        <div>
            <TransactionListItem v-for="transaction in transactions" :transaction="transaction" :key="transaction.transactionHash"/>
            <div v-if="isFetchingTxHistory && !transactions.length" class="text-center my-12">
                <img :src="loadingImageSrc" class="w-2/5 mx-auto mb-8">
                <span class="opacity-75">Fetching your transaction history...</span>
            </div>
            <div v-else-if="!transactions.length" class="text-center my-12">
                <img :src="getImage()" class="w-2/5 mx-auto mb-8">
                <span class="opacity-75">This is a quiet place with no transactions.</span>
            </div>
            <div v-else-if="transactions.length >= 10" class="text-center my-6">
                <span class="opacity-50">History is currently limited for performance.</span>
            </div>
        </div>
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
        const { isFetchingTxHistory } = useNetworkStore()

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
            isFetchingTxHistory,
            transactions,
            getImage,
            loadingImageSrc,
        }
    },
    components: {
        TransactionListItem,
    },
})
</script>

<style lang="scss">
@import '../scss/mixins.scss';
.transaction-list {
    display: flex;
    flex-direction: column;
    overflow: scroll;
}
</style>
