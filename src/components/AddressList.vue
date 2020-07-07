<template>
    <div class="address-list" :class="{'has-scrollbar': scrollbarVisible, embedded}" ref="root">
        <AddressListItem
            v-for="addressInfo in addressInfos" :key="addressInfo.address"
            :addressInfo="addressInfo"
            :class="{'active': activeAddress === addressInfo.address}"
            @click="selectAddress(addressInfo.address); $emit('address-selected', addressInfo.address);"
            :ref="`address-button-${addressInfo.address}`"/>
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
        <div v-if="!embedded"
            class="active-box"
            :style="`transform: scaleY(${backgroundYScale}) translateY(${backgroundYOffset}px)`"
        ></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, onMounted } from '@vue/composition-api';

import AddressListItem from './AddressListItem.vue';
import AddIcon from './icons/AddIcon.vue';
import { useAddressStore, AddressType, AddressInfo } from '../stores/Address';
import { useNetworkStore } from '../stores/Network';

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
            if (!addressInfo || addressInfo.type !== AddressType.VESTING) return false;

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
        const backgroundYScale = ref(1);
        function adjustBackgroundOffsetAndScale(address: string) {
            let offset = 0;
            let scalingRatio = 1;
            // TODO: In Vue 3, we will be able to use function refs, but not with the Vue 2 plugin.
            const refs = (context.refs[`address-button-${address}`] as Vue[] | undefined);
            if (refs && refs.length) {
                const el = refs[0].$el as HTMLElement;

                scalingRatio = el.clientHeight / 72; // 72px or 9rem is the original height of the activeBox
                offset = el.offsetTop / scalingRatio;
            }
            backgroundYOffset.value = offset;
            backgroundYScale.value = scalingRatio;
        }
        if (!props.embedded) {
            watch(() => activeAddress.value && adjustBackgroundOffsetAndScale(activeAddress.value));
            window.addEventListener(
                'resize',
                () => activeAddress.value && adjustBackgroundOffsetAndScale(activeAddress.value),
            );
        }

        const root = ref<HTMLElement>(null);
        const scrollbarVisible = ref(false);
        onMounted(() => {
            watch(addressInfos, () => {
                scrollbarVisible.value = !!root.value && root.value.offsetWidth > root.value.scrollWidth;
            });
        });

        return {
            root,
            scrollbarVisible,
            selectAddress,
            addressInfos: processedAddressInfos,
            activeAddress,
            backgroundYOffset,
            backgroundYScale,
        };
    },
    components: {
        AddressListItem,
        AddIcon,
    },
});
</script>

<style scoped lang="scss">
    @import '../scss/mixins.scss';

    .address-list {
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-y: auto;
        padding-top: 2.5rem;
        padding-bottom: 2.5rem;
        padding-right: var(--padding-sides);
        margin: 0 calc(-1 * var(--padding-sides));
        color: var(--text-70);
        mask: linear-gradient(0deg ,
            rgba(255,255,255, 0),
            white 3rem,
            white calc(100% - 3rem),
            rgba(255,255,255, 0)
        );

        // To make space for the .active-box leftside box-shadow
        padding-left: var(--padding-sides);

        @extend %custom-scrollbar;
    }

    .address-button {
        width: 100%;
        margin: 0.5rem 0;
        z-index: 1;
        flex-shrink: 0;

        transition: color 400ms var(--nimiq-ease), background 400ms var(--nimiq-ease);

        .has-scrollbar & {
            width: calc(100% + 6px);
        }
    }

    .add-address-button {
        font-size: var(--body-size);
        align-items: center;
        padding: 2rem;
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

        transform-origin: center top;
        transition: transform 350ms cubic-bezier(0.4, 0, 0, 1);
        will-change: transform;

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
    }

    .label {
        font-weight: 600;
        margin: 0 2rem;
        flex-grow: 1;
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

    .embedded /deep/ .mobile-arrow {
        display: none;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
        /deep/ .balances {
            display: none;
        }
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
            color: var(--text-100);
            margin: 0.25rem 0;

            /deep/ .crypto-balance {
                color: inherit !important;
            }
        }

        .add-address-button {
            padding: 1.5rem;
        }
    }
</style>
