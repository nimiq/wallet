<template>
    <div class="address-list">
        <button
            v-for="addressInfo in addressInfos" :key="addressInfo.address"
            class="address-button reset flex-row"
            :class="{'active': activeAddress === addressInfo.address}"
            @click="selectAddress(addressInfo.address)"
        >
            <div class="identicon-wrapper">
                <Identicon :address="addressInfo.address"/>
                <ClockIcon v-if="addressInfo.type === AddressType.VESTING"/>
            </div>
            <span class="label">{{ addressInfo.label }}</span>
            <div v-if="addressInfo.balance !== null" class="balances">
                <span class="crypto-balance">
                    <LockLockedIcon v-if="addressInfo.hasLockedBalance"/>
                    <Amount :amount="addressInfo.balance"/>
                </span>
                <FiatConvertedAmount
                    class="fiat-balance"
                    :amount="addressInfo.balance"/>
            </div>
            <div v-else>???</div>
        </button>
        <div class="active-box"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Identicon, LockLockedIcon } from '@nimiq/vue-components';

import { useAddressStore, AddressType, AddressInfo } from '../stores/Address';
import { useNetworkStore } from '../stores/Network';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import ClockIcon from './icons/ClockIcon.vue';

export default defineComponent({
    setup() {
        const { addressInfos, activeAddress, selectAddress } = useAddressStore();
        const { state: network$ } = useNetworkStore();

        function hasLockedBalance(addressInfo: AddressInfo, height: number): boolean {
            if (addressInfo.type !== AddressType.VESTING) return false;

            const numberVestingSteps = Math.ceil(addressInfo.totalAmount / addressInfo.stepAmount);

            const passedBlocks = Math.max(0, height - addressInfo.start);
            const passedSteps = Math.floor(passedBlocks / addressInfo.stepBlocks);

            return passedSteps < numberVestingSteps;
        }

        const processedAddressInfos = computed(() => addressInfos.value.map((addressInfo) => ({
            ...addressInfo,
            hasLockedBalance: hasLockedBalance(addressInfo, network$.height),
        })));

        return {
            selectAddress,
            addressInfos: processedAddressInfos,
            activeAddress,
            AddressType,
        };
    },
    components: {
        Identicon,
        Amount,
        FiatConvertedAmount,
        ClockIcon,
        LockLockedIcon,
    } as any,
});
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

    .identicon-wrapper {
        position: relative;

        svg {
            position: absolute;
            right: -1rem;
            bottom: -0.5rem;
            padding: 0.375rem;
            background: white;
            border-radius: 50%;
            box-shadow: 0 0 0.5rem 0 rgba(0, 0, 0, 0.15);
            color: rgba(31, 35, 72, 0.7);
        }
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
    }

    .crypto-balance {
        display: block;
        line-height: 1.2;
        font-weight: bold;
        transition: color 300ms var(--nimiq-ease);

        .nq-icon {
            font-size: 1.75rem;
        }
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
