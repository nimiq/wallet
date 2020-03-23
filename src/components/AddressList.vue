<template>
    <div class="address-list" :class="{'has-scrollbar': scrollbarVisible}" ref="root">
        <button
            v-for="addressInfo in addressInfos" :key="addressInfo.address"
            class="address-button reset flex-row"
            :class="{'active': activeAddress === addressInfo.address}"
            @click="selectAddress(addressInfo.address)"
            :ref="`address-button-${addressInfo.address}`"
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
        <div class="active-box" :style="`transform: translateY(${backgroundYOffset}px);`"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted } from '@vue/composition-api';
import { Identicon, LockLockedIcon } from '@nimiq/vue-components';

import { useAddressStore, AddressType, AddressInfo } from '../stores/Address';
import { useNetworkStore } from '../stores/Network';
import Amount from './Amount.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import ClockIcon from './icons/ClockIcon.vue';

export default defineComponent({
    setup(props, context) {
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

        const backgroundYOffset = ref(4); // px - Top margin of the address-buttons is 0.5rem
        function adjustBackgroundOffset(address: string) {
            // TODO: In Vue 3, we will be able to use function refs, but not with the Vue 2 plugin.
            const el = (context.refs[`address-button-${address}`] as Element[])[0] as HTMLElement;
            backgroundYOffset.value = el.offsetTop;
        }
        watch(() => activeAddress.value && adjustBackgroundOffset(activeAddress.value));

        const root = ref<HTMLElement>(null);
        const scrollbarVisible = ref(false);
        onMounted(() => {
            watch(addressInfos, () => {
                scrollbarVisible.value = root.value!.offsetWidth > root.value!.scrollWidth;
            });
        });

        return {
            root,
            scrollbarVisible,
            selectAddress,
            addressInfos: processedAddressInfos,
            activeAddress,
            AddressType,
            backgroundYOffset,
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
    @import '../scss/mixins.scss';

    .address-list {
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-y: auto;
        padding-bottom: 1rem;
        padding-right: var(--padding-sides);
        margin-right: calc(-1 * var(--padding-sides)) !important;

        @extend %custom-scrollbar;
    }

    $btnMargin: .5;
    $btnHeight: 9;
    .address-button {
        width: 100%;
        font-size: 2rem;
        align-items: center;
        padding: 2rem;
        margin: #{$btnMargin}rem 0;
        border-radius: 0.75rem;
        opacity: 0.6;
        z-index: 1;

        transition: opacity 400ms var(--nimiq-ease), background 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% + 6px);
        }
    }


    .active-box {
        width: calc(100% - var(--padding-sides));
        height: #{$btnHeight}rem;
        position: absolute;
        left: 0;
        top: 0;
        z-index: 0;
        border-radius: 0.75rem;
        background: white;
        box-shadow: 0 0.25rem 1.25rem rgba(0, 0, 0, 0.08);

        will-change: transform;
        transition: transform 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% - var(--padding-sides) + 6px);
        }
    }

    .identicon {
        width: 5.75rem !important;
        height: 5.75rem;
        flex-shrink: 0;
        margin: -0.375rem 0 -0.375rem;
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

    .address-button:not(.active):hover,
    .address-button:not(.active):focus {
        background: var(--nimiq-highlight-bg);
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
