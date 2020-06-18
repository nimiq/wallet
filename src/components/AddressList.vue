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

        const backgroundYOffset = ref(4 + 20); // px - Top margin of the address-buttons (0.5rem) + 2.5rem padding-top
        function adjustBackgroundOffset(address: string) {
            let offset = 0;
            // TODO: In Vue 3, we will be able to use function refs, but not with the Vue 2 plugin.
            const refs = (context.refs[`address-button-${address}`] as Element[] | undefined);
            if (refs) {
                const el = refs[0] as HTMLElement;
                offset = el.offsetTop;
            }
            backgroundYOffset.value = offset;
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
        margin-right: calc(-1 * var(--padding-sides));
        color: var(--text-70);

        // To make space for the .active-box leftside box-shadow
        padding-left: var(--padding-sides);
        margin-left: calc(-1 * var(--padding-sides));

        @extend %custom-scrollbar;
    }

    .address-button {
        width: 100%;
        font-size: var(--body-size);
        align-items: center;
        padding: 2rem;
        margin: 0.5rem 0;
        border-radius: 0.75rem;
        z-index: 1;

        transition: color 400ms var(--nimiq-ease), background 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% + 6px);
        }
    }

    .add-address-button {
        background: none !important;
    }


    .active-box {
        width: calc(100% - 2 * var(--padding-sides));
        height: 9rem;
        position: absolute;
        left: var(--padding-sides);
        top: 0;
        z-index: 0;
        border-radius: 0.75rem;
        background: var(--bg-card);
        box-shadow:
            0px 0.337011px 2px rgba(0, 0, 0, 0.0254662),
            0px 1.5px 3px rgba(0, 0, 0, 0.05),
            0px 4px 16px rgba(0, 0, 0, 0.07);

        will-change: transform;
        transition: transform 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% - 2 * var(--padding-sides) + 6px); // 6px = scrollbar width
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
        font-size: var(--small-size);
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

        transition: color 400ms var(--nimiq-ease), background 400ms var(--nimiq-ease);

        svg {
            width: 2rem;
            height: 2rem;
        }
    }

    .add-address-label {
        opacity: 0.65;
    }

    .add-address-button:hover,
    .add-address-button:focus {
        .add-address-icon {
            background: rgba(31, 35, 72, 0.1);
            color: var(--text-80);
        }
    }

    .mobile-arrow,
    .embedded .mobile-arrow {
        display: none;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        .address-list {
            margin-left: -0.5rem;
            margin-right: calc(-1 * var(--padding-sides) + 0.5rem);
        }

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
            margin: 0.25rem 0;
            padding: 1.5rem;

            .crypto-balance {
                color: inherit !important;
            }
        }

        // .active-box {
        //     height: 8rem;
        // }

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
