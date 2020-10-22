<template>
    <div class="swap-balance-bar flex-column">
        <div class="balance-bar-header flex-row">
            <div class="nimiq">
                <Identicon :address="activeAddressInfo.address" ref="$nimiqIcon" />
                <label>{{ activeAddressInfo.label }}</label>
            </div>
            <div class="bitcoin">
                <label>Bitcoin</label>
                <BitcoinIcon ref="$bitcoinIcon"/>
            </div>
        </div>
        <div class="connecting-lines">
            <CurvedLine :width="nimiqConnectingLineWidth" :height="35" direction="right" />
            <CurvedLine :width="bitcoinConnectingLineWidth" :height="35" direction="left" />
        </div>
        <div class="balance-bar flex-row">
            <div class="bar"
                v-for="addressInfo in nimDistributionData"
                :key="addressInfo.address"
                :ref="addressInfo.active ? '$activeBar' : null"
                :class="[{ active: addressInfo.active }, addressInfo.backgroundClass]"
                :style="{ width: `${getNimiqBarWidth(addressInfo)}%` }"
                @click="selectAddress(addressInfo.address)"
            >
                <div class="change"
                    v-if="addressInfo.active && addressInfo.balanceChange > 0"
                    :style="{ width: `${getNimiqChangeBarWidth(addressInfo)}%` }"
                ></div>
            </div>
            <div class="separator nq-light-blue-bg">
                <div class="handle"
                    @mousedown="onMouseDown"
                    @touchstart="onMouseDown"
                ></div>
            </div>
            <div class="bar bitcoin active"
                ref="$bitcoinBar"
                :style="{ width: `${bitcoinBarWidth}%` }"
            >
                <div class="change" v-if="btcDistributionData.balanceChange > 0"
                    :style="{ width: `${bitcoinChangeBarWidth}%` }"
                ></div>
            </div>
        </div>
        <div class="scale flex-row">
            <div v-for="index in 10" :key="index" class="tenth">
                <div v-if="index === 1" class="nimiq-total-percent ">{{distributionPercents.nim}}%</div>
                <div v-else-if="index === 10" class="bitcoin-total-percent">{{distributionPercents.btc}}%</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted, ref } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency } from '../../lib/Constants';
import { useAddressStore, AddressInfo } from '../../stores/Address';
import getBackgroundClass from '../../lib/AddressColor';
import { SwapDirection } from '../../stores/Swaps';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import { SwapAsset } from '../../lib/FastspotApi';
import CurvedLine from '../icons/SwapBalanceBar/CurvedLine.vue';

type ExtendedAddressInfo = AddressInfo & {
    readonly active: boolean,
    readonly newFiatBalance: number,
    readonly backgroundClass: string,
    readonly balanceChange: number,
    readonly fiatBalanceChange: number,
}

enum MovingDirection {
    RIGHT = 1,
    LEFT = -1,
}

export default defineComponent({
    name: 'swap-balance-bar',
    props: {
        newBtcBalance: {
            type: Number,
            required: true,
        },
        newNimBalance: {
            type: Number,
            required: true,
        },
        satsPerNim: {
            type: Number,
            required: true,
        },
        limits: {
            type: Object as () => ({ fiat?: number, btc?: number, nim?: number }),
            validator: (limits: { fiat?: number, btc?: number, nim?: number }) =>
                (limits.fiat ? typeof limits.fiat === 'number' : true)
                && (limits.btc ? typeof limits.btc === 'number' : true)
                && (limits.nim ? typeof limits.nim === 'number' : true),
        },
    },
    setup(props, context) {
        const { addressInfos, selectAddress, activeAddressInfo } = useAddressStore();
        const { accountBalance } = useBtcAddressStore();
        const { exchangeRates, currency } = useFiatStore();

        const nimExchangeRate = computed(() =>
            exchangeRates.value?.[CryptoCurrency.NIM][currency.value] || 0);
        const btcExchangeRate = computed(() =>
            exchangeRates.value?.[CryptoCurrency.BTC][currency.value] || 0);

        const nimDistributionData = computed(() =>
            addressInfos.value
                // .filter((addressInfo) => addressInfo.type === 0) // filter no Vesting or Htlc account types ?
                .map((addressInfo) => ({
                    ...addressInfo,
                    get active() {
                        return (activeAddressInfo.value?.address === this.address);
                    },
                    get newFiatBalance() {
                        if (!this.active) {
                            return ((this.balance || 0) / 1e5) * nimExchangeRate.value;
                        }

                        return (props.newNimBalance / 1e5) * nimExchangeRate.value;
                    },
                    get balanceChange() {
                        if (!this.active) return 0;

                        return (props.newNimBalance - (this.balance || 0));
                    },
                    get fiatBalanceChange() {
                        return (this.balanceChange / 1e5) * nimExchangeRate.value;
                    },
                    get backgroundClass() {
                        return getBackgroundClass(this.address);
                    },
                } as ExtendedAddressInfo)),
        );
        const btcDistributionData = computed(() => ({
            newFiatBalance: (props.newBtcBalance / 1e8) * btcExchangeRate.value,
            balanceChange: (props.newBtcBalance - accountBalance.value),
            fiatBalanceChange: ((props.newBtcBalance - accountBalance.value) / 1e8) * btcExchangeRate.value,
        }));
        const nimiqTotalNewFiatBalance = computed(() =>
            nimDistributionData.value.reduce((sum, data) => sum + data.newFiatBalance, 0),
        );
        const totalNewFiatBalance = computed(() =>
            nimiqTotalNewFiatBalance.value + btcDistributionData.value.newFiatBalance,
        );
        const distributionPercents = computed(() => ({
            nim: Math.round((nimiqTotalNewFiatBalance.value / totalNewFiatBalance.value) * 100),
            btc: Math.round((btcDistributionData.value.newFiatBalance / totalNewFiatBalance.value) * 100),
        }));

        // handle behavior
        let isGrabbing = false;
        let initialCursorPosition = 0;
        let currentCursorPosition = 0;
        let animationFrameHandle = 0;

        const $bitcoinBar = ref<HTMLDivElement | null>(null);
        const activeBar = computed(() =>
            nimDistributionData.value.find((addressInfo) => addressInfo.active),
        );
        const $activeBar = ref<HTMLDivElement[] | null>(null);

        function onMouseDown(event: MouseEvent | TouchEvent) {
            isGrabbing = true;
            if (event instanceof MouseEvent) {
                initialCursorPosition = event.pageX;
                currentCursorPosition = event.pageX;
            } else {
                initialCursorPosition = event.touches[0].pageX;
                currentCursorPosition = event.touches[0].pageX;
            }
        }

        function onMouseUp(/* event: MouseEvent | TouchEvent */) {
            isGrabbing = false;
        }

        function onMouseMove(event: MouseEvent | TouchEvent) {
            if (!isGrabbing) return;

            if (event instanceof MouseEvent) {
                currentCursorPosition = event.pageX;
            } else {
                currentCursorPosition = event.touches[0].pageX;
            }
        }

        function emit(asset: SwapAsset, amount: number) {
            context.emit('change', {
                asset,
                amount: Math.ceil(amount),
            });
        }

        function render(): void {
            animationFrameHandle = requestAnimationFrame(render);

            /*
                There is a lot of issues when updating lines width in a watcher, or turning them into computed.
                So we're updating it in the render loop until a more optimized way to do it is found.
            */
            updateConnectingLinesWidth();

            if (!isGrabbing || !$activeBar.value || !$bitcoinBar.value || !activeBar.value) return undefined;

            const cursorPositionDiff = currentCursorPosition - initialCursorPosition;
            initialCursorPosition = currentCursorPosition;

            if (cursorPositionDiff === 0) return undefined;

            const movingDirection = cursorPositionDiff > 0 ? MovingDirection.RIGHT : MovingDirection.LEFT;
            const nimPercent = Math.abs(cursorPositionDiff)
                / ($activeBar.value[0].clientWidth > 1 ? $activeBar.value[0].clientWidth : 1);
            const btcPercent = Math.abs(cursorPositionDiff)
                / ($bitcoinBar.value.clientWidth > 1 ? $bitcoinBar.value.clientWidth : 1);

            const lunaAmount = activeBar.value.balanceChange
                + ((props.newNimBalance * nimPercent) * movingDirection);

            const satoshiAmount = btcDistributionData.value.balanceChange
                + ((props.newBtcBalance * btcPercent) * -movingDirection);

            if (props.limits && typeof props.limits.fiat === 'number') {
                if ((lunaAmount / 1e5) * nimExchangeRate.value < -props.limits.fiat
                    && movingDirection === MovingDirection.LEFT) {
                    return emit(SwapAsset.NIM, -(props.limits.fiat / nimExchangeRate.value) * 1e5);
                }
                if ((satoshiAmount / 1e8) * btcExchangeRate.value < -props.limits.fiat
                    && movingDirection === MovingDirection.RIGHT) {
                    return emit(SwapAsset.BTC, -(props.limits.fiat / btcExchangeRate.value) * 1e8);
                }
            }

            if (lunaAmount < -(activeBar.value.balance || 0) && movingDirection === MovingDirection.LEFT) {
                return emit(SwapAsset.NIM, -(activeBar.value.balance || 0));
            }
            if (satoshiAmount < -accountBalance.value && movingDirection === MovingDirection.RIGHT) {
                return emit(SwapAsset.BTC, -accountBalance.value);
            }

            if (nimPercent >= 1 && props.newNimBalance === 0 && movingDirection === MovingDirection.RIGHT) {
                return emit(SwapAsset.NIM, lunaAmount
                    + (((props.newBtcBalance * btcPercent) * movingDirection) / props.satsPerNim));
            }

            if (btcPercent >= 1 && props.newBtcBalance === 0 && movingDirection === MovingDirection.LEFT) {
                return emit(SwapAsset.BTC, satoshiAmount
                    + (((props.newNimBalance * nimPercent * -movingDirection) / 1e5) * props.satsPerNim));
            }

            if (lunaAmount <= 0) {
                return emit(SwapAsset.NIM, lunaAmount);
            }
            return emit(SwapAsset.BTC, satoshiAmount);
        }

        onMounted(() => {
            document.body.addEventListener('mouseup', onMouseUp);
            document.body.addEventListener('touchend', onMouseUp);
            document.body.addEventListener('mousemove', onMouseMove);
            document.body.addEventListener('touchmove', onMouseMove);
            render();
        });

        onUnmounted(() => {
            document.body.removeEventListener('mouseup', onMouseUp);
            document.body.removeEventListener('touchend', onMouseUp);
            document.body.removeEventListener('mousemove', onMouseMove);
            document.body.removeEventListener('touchmove', onMouseMove);
            cancelAnimationFrame(animationFrameHandle);
        });

        /* Bars' width */
        const getNimiqBarWidth = (addressInfo: ExtendedAddressInfo) => {
            const width = (addressInfo.newFiatBalance / totalNewFiatBalance.value) * 100;
            if (width < .5) return .5;
            return width;
        };
        const getNimiqChangeBarWidth = (addressInfo: ExtendedAddressInfo) =>
            (addressInfo.fiatBalanceChange / addressInfo.newFiatBalance) * 100;
        const bitcoinBarWidth = computed(() =>
            (btcDistributionData.value.newFiatBalance / totalNewFiatBalance.value) * 100,
        );
        const bitcoinChangeBarWidth = computed(() =>
            (btcDistributionData.value.fiatBalanceChange / btcDistributionData.value.newFiatBalance) * 100,
        );

        /* Connecting lines between icon and active bar */
        const remSize = computed(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
        const nimiqConnectingLineWidth = ref(0);
        const bitcoinConnectingLineWidth = ref(0);

        function updateConnectingLinesWidth() {
            if ($activeBar.value && $activeBar.value[0].parentElement) {
                const rect = $activeBar.value[0].getBoundingClientRect();

                nimiqConnectingLineWidth.value = (rect.width / 2)
                    + (rect.x - $activeBar.value[0].parentElement.getBoundingClientRect().x)
                    - (remSize.value * 2.5);
            }

            if ($bitcoinBar.value) {
                const rect = $bitcoinBar.value.getBoundingClientRect();

                bitcoinConnectingLineWidth.value = (rect.width / 2) - (remSize.value * 2.5);
            }
        }

        return {
            SwapDirection,
            addressInfos,
            nimDistributionData,
            activeAddressInfo,
            totalNewFiatBalance,
            btcDistributionData,
            selectAddress,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            $activeBar,
            $bitcoinBar,
            getNimiqBarWidth,
            getNimiqChangeBarWidth,
            bitcoinBarWidth,
            bitcoinChangeBarWidth,
            nimiqConnectingLineWidth,
            bitcoinConnectingLineWidth,
            nimiqTotalNewFiatBalance,
            distributionPercents,
        };
    },
    components: {
        BitcoinIcon,
        Identicon,
        CurvedLine,
    },
});
</script>

<style lang="scss" scoped>

.swap-balance-bar {}

.balance-bar-header {
    --height: 5.25rem;
    height: var(--height);

    & > div {
        display: flex;
        flex-direction: row;
        flex-grow: 1;
        align-items: center;

        label {
            font-weight: 600;
            line-height: 21px;
        }
    }

    .nimiq {
        max-width: 65%;

        .identicon {
            width: var(--height);
            height: 100%;
            margin-right: 1.5rem;
            flex-shrink: 0;
        }

        label {
            text-overflow: ellipsis;
            white-space: nowrap;
            overflow: hidden;
        }
    }

    .bitcoin {
        justify-content: flex-end;

        svg {
            margin-left: 2rem;
            color: var(--bitcoin-orange);
        }
    }
}

.connecting-lines {
    margin-top: .5rem;
    margin-bottom: -3rem;
    padding: 0 2.5rem;

    svg:last-child {
        float: right;
    }
}

.balance-bar {
    align-items: center;
}

.bar {
    height: 4.5rem;
    border-radius: 0.5rem;
    background-color: silver;
    opacity: 0.25;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    cursor: pointer;

    transition: opacity 300ms var(--nimiq-ease), width 10ms;

    &:not(:last-child) {
        margin-right: 3px;
    }

    &:first-child,
    &:last-child {
        border-radius: 1.2rem; // css bug? increasing left border radius decrease the right one... Should be 0.5rem
        --endBorderRadius: 5rem;
    }

    &:first-child {
        border-top-left-radius: var(--endBorderRadius);
        border-bottom-left-radius: var(--endBorderRadius);
    }

    &:last-child {
        border-top-right-radius: var(--endBorderRadius);
        border-bottom-right-radius: var(--endBorderRadius);
    }

    &.active {
        opacity: 1;
    }

    &.bitcoin {
        background-color: var(--bitcoin-orange);
        justify-content: flex-start;

        .change {
            background-position: right;
        }
    }

    .change {
        background: url('../../assets/swap-change-background.svg') repeat-x;
        height: calc(100% - .5rem);
        margin: 0 0.25rem;
        border-radius: 0.25rem;
        transition: width 10ms;
    }
}

.separator {
    width: 2px;
    margin-right: 3px;
    height: 10.5rem;
    position: relative;
    flex-shrink: 0;
    touch-action: none;

    .handle {
        --height: 3rem;
        --width: 3.25rem;

        height: var(--height);
        width: var(--width);
        background: white url('../../assets/horizontal-double-arrow.svg') no-repeat center;
        border-radius: 4px;
        box-shadow:
            0px 4px 16px rgba(0, 0, 0, 0.07),
            0px 1.5px 3px rgba(0, 0, 0, 0.05),
            0px 0.337011px 2px rgba(0, 0, 0, 0.0254662);

        position: absolute;
        top: calc(50% - (var(--height) / 2));
        left: calc(50% - (var(--width) / 2));
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }
}

.scale {
    margin-top: -1rem;
    width: 100%;
    justify-content: space-between;
    align-items: center;

    .tenth {
        height: 1rem;
        line-height: 1rem;
        width: 20%;

        font-weight: bold;
        font-size: var(--small-size);
        letter-spacing: 0.5px;
        color: var(--text-50);

        &:not(:last-child) {
            border-right: 1.5px solid var(--text-20);
        }

        &:last-child {
            text-align: right;
        }
    }
}

</style>
