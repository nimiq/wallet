<template>
    <div class="address-list">
        <button
            v-for="addressInfo in addressInfos" :key="addressInfo.address"
            class="address-button reset flex-row"
            :class="{'active': activeAddress === addressInfo.address}"
            @click="selectAddress(addressInfo.address)"
        >
            <Identicon :address="addressInfo.address" class=""/>
            <span class="label">{{ addressInfo.label }}</span>
            <div v-if="addressInfo.balance !== null" class="balances">
                <Amount
                    class="crypto-balance"
                    :amount="addressInfo.balance"/>
                <FiatAmount
                    class="fiat-balance"
                    :amount="addressInfo.balance"/>
            </div>
            <div v-else>???</div>
        </button>
        <div class="active-box"></div>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useAddressStore } from '../stores/Address'

import { Identicon } from '@nimiq/vue-components';
import Amount from './Amount.vue';
import FiatAmount from './FiatAmount.vue';
import { useSettingsStore } from '../stores/Settings';

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
        position: relative;
    }

    $btnMargin: .5;
    $btnHeight: 10;
    .address-button {
        width: 100%;
        font-size: 2rem;
        align-items: center;
        padding: 2rem;
        margin: #{$btnMargin}rem 0;
        border-radius: 0.5rem;
        opacity: 0.6;
        z-index: 1;

        transition: opacity 500ms var(--nimiq-ease);
    }

    .active-box {
        width: 100%;
        height: #{$btnHeight}rem;
        position: absolute;
        top: #{$btnMargin}rem;
        z-index: 0;
        border-radius: 8px;
        background-color: white;
        box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.08);
        transition: top 500ms var(--nimiq-ease);
    }

    $states: ".active", ":focus", ":hover";
    @mixin topVal($i) {
        top: #{$btnMargin + ($i - 1) * ($btnHeight + $btnMargin * 2)}rem;
    }
    @each $state in $states {
        @for $i from 1 through 10 {
            .address-button:nth-child(#{$i})#{$state} ~ .active-box {
                @include topVal($i);
            }
        }
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

    .address-button:hover,
    .address-button:focus,
    .address-button.active {
        opacity: 1;
    }

    .address-button:hover .crypto-balance,
    .address-button:focus .crypto-balance,
    .address-button.active .crypto-balance {
        color: var(--nimiq-light-blue);
    }

    .fiat-balance {
        font-size: 1.75rem;
        font-weight: 600;
        opacity: 0.5;
    }
</style>
