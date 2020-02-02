<template>
    <div class="address-list">
        <button
            v-for="addressInfo in Object.values(addressInfos)" :key="addressInfo.address"
            class="address-button reset flex-row"
            :class="{'active': activeAddress === addressInfo.address}"
            @click="selectAddress(addressInfo.address)"
        >
            <Identicon :address="addressInfo.address" class=""/>
            <span class="label">{{ addressInfo.label }}</span>
            <div v-if="addressInfo.balance !== null" class="balances">
                <Amount
                    class="crypto-balance"
                    :amount="addressInfo.balance"
                    :maxDecimals="2"/>
                <FiatAmount
                    v-if="activeAddress === addressInfo.address"
                    class="fiat-balance"
                    :amount="addressInfo.balance"/>
            </div>
            <div v-else>???</div>
        </button>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAddressStore } from '../stores/Address'

import { Identicon, Amount } from '@nimiq/vue-components';
import FiatAmount from './FiatAmount.vue';

export default createComponent({
    setup() {
        const { addressInfos, activeAddress, selectAddress } = useAddressStore()

        return {
            selectAddress,
            addressInfos,
            activeAddress,
        }
    },
    components: {
        Identicon,
        Amount,
        FiatAmount,
    } as any,
})
</script>

<style scoped lang="scss">
    .address-list {
        display: flex;
        flex-direction: column;
    }

    .address-button {
        width: 100%;
        background: rgba(31, 35, 72, 0); /* Based on Nimiq Blue */;
        font-size: 2rem;
        align-items: center;
        padding: 2rem;
        margin: 0.5rem 0;
        border-radius: 0.5rem;
        opacity: 0.5;

        transition: background-color 300ms var(--nimiq-ease), opacity 300ms var(--nimiq-ease);
    }

    .address-button:hover,
    .address-button:focus,
    .address-button.active {
        opacity: 1;
        background: var(--nimiq-highlight-bg);
    }

    .identicon {
        width: 6rem !important;
        height: 6rem;
        flex-shrink: 0;
    }

    .label {
        font-weight: bold;
        margin-left: 2rem;
        flex-grow: 1;
        margin-right: 2rem;
    }

    .balances {
        text-align: right;
        flex-shrink: 0;
        line-height: 1.2;
    }

    .crypto-balance {
        display: block;
        font-weight: bold;
        transition: color 300ms var(--nimiq-ease);
    }

    .address-button:hover .crypto-balance,
    .address-button:focus .crypto-balance,
    .address-button.active .crypto-balance {
        color: var(--nimiq-green);
    }

    .fiat-balance {
        font-size: 1.75rem;
        font-weight: 600;
        opacity: 0.5;
    }
</style>
