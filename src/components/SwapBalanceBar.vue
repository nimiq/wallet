<template>
    <div class="swap-balance-bar">
        <div class="bar"
            v-for="addressInfo in extendedAddressInfos"
            :key="addressInfo.address"
            :class="[{ active: activeAddress === addressInfo.address }, addressInfo.backgroundClass]"
            :style="{ width: `${addressInfo.newBalance / totalBalance * 100}%` }"
        ></div>
        <div class="separator"></div>
        <div class="bar bitcoin active"
            :style="{ width: `${btcDistributionData.newBalance / totalBalance * 100}%` }"
        ></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { useFiatStore } from '@/stores/Fiat';
import { CryptoCurrency } from '@/lib/Constants';
import { useAddressStore, AddressInfo } from '../stores/Address';
import getBackgroundClass from '../lib/AddressColor';

export default defineComponent({
    name: 'swap-balance-bar',
    setup({ direction }, context) {
        const { addressInfos, activeAddress } = useAddressStore();
        const { accountBalance } = useBtcAddressStore();
        const { exchangeRates, currency } = useFiatStore();

        const extendedAddressInfos = computed(() =>
            addressInfos.value
                // .filter((addressInfo) => addressInfo.type === 0) // filter no Vesting or Htlc account types
                .filter((addressInfo) => addressInfo.balance)
                .map((addressInfo) => ({
                    ...addressInfo,
                    get newBalance(): number {
                        return (((this as AddressInfo).balance || 0) / 1e5)
                            * (exchangeRates.value?.[CryptoCurrency.NIM][currency.value] || 0);
                    },
                    get backgroundClass() {
                        return getBackgroundClass((this as AddressInfo).address);
                    },
                })),
        );

        const btcDistributionData = computed(() => ({
            get newBalance() {
                return ((accountBalance.value || 0) / 1e8)
                    * (exchangeRates.value?.[CryptoCurrency.BTC][currency.value] || 0);
            },
            backgroundClass: 'bitcoin',
            active: true,
        }));

        const totalBalance = computed(() =>
            extendedAddressInfos.value.reduce((sum, data) => sum + (data.newBalance || 0), 0)
                + btcDistributionData.value.newBalance,
        );

        return {
            addressInfos,
            extendedAddressInfos,
            activeAddress,
            totalBalance,
            btcDistributionData,
        };
    },
});
</script>

<style lang="scss" scoped>

.swap-balance-bar {
    display: flex;
}

.bar {
    height: 4.5rem;
    border-radius: 0.5rem;
    background-color: silver;

    &:not(:last-child) {
        margin-right: 3px;
    }

    &:first-child,
    &:last-child {
        border-radius: 1.2rem; // css bug? increasing left border radius decrease the right one...
    }

    &:first-child {
        border-top-left-radius: 5rem;
        border-bottom-left-radius: 5rem;
    }

    &:last-child {
        border-top-right-radius: 5rem;
        border-bottom-right-radius: 5rem;
    }

    &.bitcoin {
        background-color: #F7931A; /* Bitcoin orange */
    }
}

</style>
