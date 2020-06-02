<template>
    <div class="address-list" :class="{'has-scrollbar': scrollbarVisible, embedded}" ref="root">
        <button
            v-for="addressInfo in addressInfos" :key="addressInfo.address"
            class="address-button reset flex-row"
            :class="{'active': activeAddress === addressInfo.address}"
            @click="selectAddress(addressInfo.address); $emit('address-selected', addressInfo.address);"
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
            <div class="mobile-arrow"></div>
        </button>
        <button
            v-if="showAddAddressButton"
            class="address-button add-address-button reset flex-row"
            @click="$emit('add-address')"
        >
            <div class="identicon-wrapper">
                <div class="identicon add-address-icon flex-row"><AddIcon/></div>
            </div>
            <span class="label add-address-label">{{ $t('Add Address') }}</span>
        </button>
        <div v-if="!embedded" class="active-box" :style="`transform: translateY(${backgroundYOffset}px);`"></div>
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
import AddIcon from './icons/AddIcon.vue';

export default defineComponent({
    props: {
        embedded: {
            type: Boolean,
            default: false,
        },
        showAddAddressButton: {
            type: Boolean,
            default: false,
        },
    },
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
        if (!props.embedded) {
            watch(() => activeAddress.value && adjustBackgroundOffset(activeAddress.value));
        }

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
        AddIcon,
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
        color: var(--text-70);

        // To make space for the .active-box leftside box-shadow
        padding-left: 1rem;
        margin-left: -1rem;

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
        z-index: 1;

        transition: color 400ms var(--nimiq-ease), background 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% + 6px);
        }
    }


    .active-box {
        width: calc(100% - var(--padding-sides) - 1rem);
        height: #{$btnHeight}rem;
        position: absolute;
        left: 1rem;
        top: 0;
        z-index: 0;
        border-radius: 0.75rem;
        background: var(--bg-card);
        box-shadow: 0 0.25rem 1.25rem rgba(0, 0, 0, 0.08);

        will-change: transform;
        transition: transform 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% - var(--padding-sides) - 1rem + 6px);
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

        > svg {
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
        font-weight: 600;
        margin: 0 2rem;
        flex-grow: 1;
    }

    .balances {
        text-align: right;
        flex-shrink: 0;
    }

    .crypto-balance {
        display: block;
        line-height: 1.2;
        font-weight: bold;

        .nq-icon {
            display: inline-block;
            font-size: 1.75rem;
        }
    }

    .address-button:hover,
    .address-button:focus,
    .address-button.active,
    .embedded .address-button {
        color: var(--text-100);
    }

    .address-button:not(.active):hover,
    .address-button:not(.active):focus,
    .embedded .address-button:hover,
    .embedded .address-button:focus {
        background: var(--nimiq-highlight-bg);
    }

    .fiat-balance {
        font-size: 1.75rem;
        font-weight: 600;
        opacity: 0.5;
    }

    .add-address-icon {
        justify-content: center;
        align-items: center;
        width: 5rem !important;
        height: 5rem;
        margin: 0 calc(0.75rem / 2);
        background: var(--nimiq-highlight-bg);
        border-radius: 50%;
        color: var(--text-50);

        svg {
            width: 2rem;
            height: 2rem;
        }
    }

    .add-address-label {
        opacity: 0.65;
    }

    .mobile-arrow,
    .embedded .mobile-arrow {
        display: none;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        .active-box {
            display: none;
        }

        .label {
            margin: 0 1.5rem;
        }

        .address-button {
            background: none !important;
            position: relative;
            color: var(--text-100);

            .crypto-balance {
                color: inherit !important;
            }
        }

        .mobile-arrow {
            display: block;
            border: 1rem solid transparent;
            border-width: 0.5rem 0.75rem;
            border-left-color: inherit;
            margin-left: 1.5rem;
            margin-right: -0.75rem;
            opacity: 0.3;
        }
    }
</style>
