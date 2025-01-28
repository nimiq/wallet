<template>
    <div class="address-list" :class="{'has-scrollbar': scrollbarVisible, embedded}" ref="root$">
        <div class="scroll-mask top" v-if="embedded"></div>
        <AddressListItem
            v-for="addressInfo in addressInfos" :key="addressInfo.address"
            :embedded="embedded"
            :addressInfo="addressInfo"
            :class="{ 'active': activeAddress === addressInfo.address && activeCurrency === CryptoCurrency.NIM }"
            @click="selectAddress(addressInfo.address);"
            :ref="`address-button-${addressInfo.address}`"
            :disabled="requiredBalance > (addressInfo.balance || 0)"/>
        <button
            v-if="showAddAddressButton"
            class="address-button add-address-button reset flex-row"
            @click="$emit('add-address')"
        >
            <div class="identicon-wrapper">
                <div class="identicon add-address-icon flex-row"><AddIcon/></div>
            </div>
            <span class="label add-address-label">{{ $t('Add\u00a0address') }}</span>
        </button>
        <div class="scroll-mask bottom" v-if="embedded"></div>
        <hr class="separator" v-if="showBitcoin || showStablecoin"/>
        <AddressListItem
            v-if="showBitcoin"
            :addressInfo="btcInfo"
            :class="{ 'active': activeCurrency === CryptoCurrency.BTC }"
            @click="selectBtcAddress()"
            :ref="`address-button-${btcInfo.address}`"/>
        <AddressListItem
            v-if="showStablecoin"
            :addressInfo="stablecoinInfo"
            :class="{ 'active': activeCurrency === CryptoCurrency.USDC || activeCurrency === CryptoCurrency.USDT }"
            @click="selectStablecoinAddress()"
            :ref="`address-button-${stablecoinInfo.address}`"/>
        <div v-if="!embedded"
            class="active-box"
            :class="{ enabled: activeCurrency === CryptoCurrency.NIM }"
            :style="`--backgroundYScale: ${backgroundYScale}; --backgroundYOffset: ${backgroundYOffset}px`"
        ></div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, computed, ref, watch, onMounted, onActivated, onUnmounted } from '@vue/composition-api';

import { useI18n } from '@/lib/useI18n';
import { nextTick } from '@/lib/nextTick';
import AddressListItem from './AddressListItem.vue';
import AddIcon from './icons/AddIcon.vue';
import { useAddressStore, AddressType, AddressInfo } from '../stores/Address';
import { useNetworkStore } from '../stores/Network';
import { useAccountStore } from '../stores/Account';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { CryptoCurrency } from '../lib/Constants';
import router from '../router';
import { useSettingsStore } from '../stores/Settings';
import { useAccountSettingsStore } from '../stores/AccountSettings';
import { useStakingStore } from '../stores/Staking';

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
        showBitcoin: {
            type: Boolean,
            default: false,
        },
        showStablecoin: {
            type: Boolean,
            default: false,
        },
        requiredBalance: {
            type: Number,
            default: 0, // enables all addresses
        },
    },
    setup(props, context) {
        const { addressInfos, activeAddress, selectAddress } = useAddressStore();
        const { availableExternalAddresses, accountBalance: btcAccountBalance } = useBtcAddressStore();
        const {
            addressInfo: polygonAddressInfo,
            accountUsdcBalance,
            accountUsdcBridgedBalance,
            accountUsdtBridgedBalance,
        } = usePolygonAddressStore();
        const { stablecoin } = useAccountSettingsStore();
        const { activeCurrency, setActiveCurrency } = useAccountStore();
        const { height } = useNetworkStore();
        const { amountsHidden } = useSettingsStore();
        const { totalAccountStake } = useStakingStore();
        const { $t } = useI18n();

        function hasLockedBalance(addressInfo: AddressInfo): boolean {
            if (!addressInfo || addressInfo.type !== AddressType.VESTING) return false;

            const numberVestingSteps = Math.ceil(addressInfo.totalAmount / addressInfo.stepAmount);

            let passedSteps: number;
            if ('startTime' in addressInfo) {
                const passedTime = Math.max(0, Date.now() - addressInfo.startTime);
                passedSteps = Math.floor(passedTime / addressInfo.timeStep);
            } else {
                const passedBlocks = Math.max(0, height.value - addressInfo.start);
                passedSteps = Math.floor(passedBlocks / addressInfo.stepBlocks);
            }

            return passedSteps < numberVestingSteps;
        }

        const processedAddressInfos = computed(() => addressInfos.value.map((addressInfo) => ({
            ...addressInfo,
            hasLockedBalance: hasLockedBalance(addressInfo),
        })));

        const backgroundYOffset = ref(4 + 20); // px - Top margin of the address-buttons (0.5rem) + 2.5rem padding-top
        const backgroundYScale = ref(1);
        async function adjustBackgroundOffsetAndScale(address: string) {
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
            watch(activeAddress, () => activeAddress.value && adjustBackgroundOffsetAndScale(activeAddress.value));
            /* Update the .active-box after the decimals setting is changed */
            router.afterEach((to, from) => {
                if (from.name === 'settings' && from.query.sidebar && to.name === 'root' && activeAddress.value) {
                    nextTick(() =>
                        activeAddress.value && adjustBackgroundOffsetAndScale(activeAddress.value),
                    );
                }
            });
        }

        const root$ = ref<HTMLElement | null>(null);
        const scrollbarVisible = ref(false);
        const resizeObserver = new ResizeObserver(() => {
            if (activeAddress.value) adjustBackgroundOffsetAndScale(activeAddress.value);
        });
        onMounted(() => {
            /* nextTick works here except for Opera browser. Using setTimeout instead fix it. */
            /* TODO: find a better way to do it. */
            setTimeout(async () => {
                if (activeAddress.value) adjustBackgroundOffsetAndScale(activeAddress.value);
            }, 0);

            watch(addressInfos, () => {
                scrollbarVisible.value = !!root$.value && root$.value.offsetWidth > root$.value.scrollWidth;
            });

            if (!props.embedded) {
                resizeObserver.observe(root$.value!);
            }
        });

        onActivated(() => activeAddress.value && adjustBackgroundOffsetAndScale(activeAddress.value));
        watch(amountsHidden, () => activeAddress.value && adjustBackgroundOffsetAndScale(activeAddress.value));
        onUnmounted(() => {
            resizeObserver.disconnect();
        });

        function selectNimAddress(address: string) {
            adjustBackgroundOffsetAndScale(address);
            setTimeout(() => {
                selectAddress(address);
                setActiveCurrency(CryptoCurrency.NIM);
                context.emit('address-selected', address);
            }, 0);
        }

        const btcInfo = computed(() => ({
            address: availableExternalAddresses.value[0] || 'bitcoin',
            label: $t('Bitcoin') as string,
            balance: btcAccountBalance.value,
            type: CryptoCurrency.BTC,
        }));

        const stablecoinInfo = computed(() => {
            if (stablecoin.value === CryptoCurrency.USDC) {
                return {
                    address: polygonAddressInfo.value?.address || 'usdc',
                    label: $t('USD Coin') as string,
                    balance: accountUsdcBalance.value
                        + accountUsdcBridgedBalance.value,
                    type: CryptoCurrency.USDC,
                };
            }

            if (stablecoin.value === CryptoCurrency.USDT) {
                return {
                    address: polygonAddressInfo.value?.address || 'usdt',
                    label: $t('Tether USD') as string,
                    balance: accountUsdtBridgedBalance.value,
                    type: CryptoCurrency.USDT,
                };
            }

            return null;
        });

        function selectBtcAddress() {
            adjustBackgroundOffsetAndScale(btcInfo.value.address);
            setTimeout(() => {
                setActiveCurrency(CryptoCurrency.BTC);
                context.emit('address-selected', btcInfo.value.address);
            }, 0);
        }

        function selectStablecoinAddress() {
            if (!stablecoin.value || !stablecoinInfo.value) return;
            adjustBackgroundOffsetAndScale(stablecoinInfo.value.address);
            setTimeout(() => {
                setActiveCurrency(stablecoin.value!);
                context.emit('address-selected', stablecoinInfo.value!.address);
            }, 0);
        }

        watch(totalAccountStake, (newStake, oldStake) => {
            if (Boolean(newStake) !== Boolean(oldStake) && activeAddress.value) {
                adjustBackgroundOffsetAndScale(activeAddress.value);
            }
        }, { lazy: true });

        return {
            root$,
            scrollbarVisible,
            selectAddress: selectNimAddress,
            addressInfos: processedAddressInfos,
            activeAddress,
            backgroundYOffset,
            backgroundYScale,
            activeCurrency,
            CryptoCurrency,
            btcInfo,
            stablecoinInfo,
            selectBtcAddress,
            selectStablecoinAddress,
            totalAccountStake,
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

    @include scroll-mask(true, true, true);

    .scroll-mask {
        width: calc(100% + 2 * var(--padding-sides));
        margin-left: calc(-1 * var(--padding-sides));
    }

    .address-list {
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: var(--padding-sides);
        margin: 0 calc(-1 * var(--padding-sides));
        color: var(--text-70);

        touch-action: pan-y;

        // To make space for the .active-box leftside box-shadow
        padding-left: var(--padding-sides);

        @extend %custom-scrollbar;

        hr.separator {
            margin: 15px 0 15px 0;
            margin-top: auto;
            border-top: 1.5px solid var(--nimiq-blue);
            opacity: 0.14;
        }
    }

    .address-button {
        margin: 0.5rem 0;
        z-index: 1;
        flex-shrink: 0;

        transition: color 400ms var(--nimiq-ease), background 400ms var(--nimiq-ease);

        .has-scrollbar &:not(.add-address-button) {
            width: calc(100% + 6px);
        }
    }

    .add-address-button {
        align-self: flex-start;
        font-size: var(--body-size);
        align-items: center;
        padding: 2rem;
        background: none !important;
    }

    .active-box {
        --backgroundYScale: 1;
        --backgroundYOffset: 0px;

        width: calc(100% - 2 * var(--padding-sides));
        height: 9rem;
        position: absolute;
        left: var(--padding-sides);
        top: 0;
        z-index: 0;
        border-radius: 0.75rem;
        background: var(--bg-card);
        opacity: 0;
        box-shadow: none;
        transform-origin: center top;
        transform: scaleY(var(--backgroundYScale)) translateY(var(--backgroundYOffset));
        will-change: transform;

        transition-property: opacity, box-shadow;
        transition-duration: 350ms;
        transition-timing-function: cubic-bezier(0.4, 0, 0, 1);

        &.enabled {
            transition-property: transform, opacity, box-shadow;

            opacity: 1;
            box-shadow:
                0px 0.337011px 2px rgba(0, 0, 0, 0.0254662),
                0px 1.5px 3px rgba(0, 0, 0, 0.05),
                0px 4px 16px rgba(0, 0, 0, 0.07);
        }

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
            background: nimiq-blue(0.1);
            color: var(--text-80);
        }
    }

    .embedded ::v-deep .mobile-arrow {
        display: none;
    }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
        .account-stake {
            margin-right: 1.75rem;
        }

        .active-box {
            display: none;
        }

        .label {
            margin: 0 1.5rem;
        }

        .address-button {
            color: var(--text-100);
            margin: 0.25rem 0;

            &.active {
                background: var(--nimiq-highlight-bg);
            }
        }

        .add-address-button {
            padding: 1.5rem;
        }

        .embedded ::v-deep .mobile-arrow {
            display: inherit;
        }
    }
</style>
