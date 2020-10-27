<template>
    <div class="swap-balance-bar flex-column" ref="$el" :class="{ animating: animatingBars }">
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
                :class="[{ active: addressInfo.active }, `nq-${addressInfo.barColor}`]"
                :style="{ width: `${getNimiqBarWidth(addressInfo)}%` }"
                @click="selectAddress(addressInfo.address)"
            >
                <div class="change"
                    ref="$nimChangeBar"
                    v-if="addressInfo.active && addressInfo.balanceChange > 0"
                    :style="{ width: `${getNimiqChangeBarWidth(addressInfo)}%` }"
                ></div>
            </div>
            <div class="separator nq-light-blue-bg">
                <div class="handle"
                    @mousedown="onMouseDown"
                    @touchstart="onMouseDown"
                ></div>
                <div class="equilibrium-point nq-light-blue-bg"
                    :class="{ hidden: equiPointVisible }"
                    :style="{ '--translateX': `${equiPointPositionX}px` }"
                    @click="animatedReset"
                ></div>
            </div>
            <div class="bar bitcoin active"
                ref="$bitcoinBar"
                :style="{ width: `${bitcoinBarWidth}%` }"
            >
                <div class="change"
                    ref="$btcChangeBar"
                    v-if="btcDistributionData.balanceChange > 0"
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
// @ts-ignore Could not find a declaration file for module '@nimiq/iqons'.
import { getBackgroundColorName } from '@nimiq/iqons';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency } from '../../lib/Constants';
import { useAddressStore, AddressInfo } from '../../stores/Address';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import { SwapAsset } from '../../lib/FastspotApi';
import CurvedLine from '../icons/SwapBalanceBar/CurvedLine.vue';

type ExtendedAddressInfo = AddressInfo & {
    readonly active: boolean,
    readonly newFiatBalance: number,
    readonly barColor: string,
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

        const $el = ref<HTMLDivElement | null>(null);

        const nimExchangeRate = computed(() =>
            exchangeRates.value?.[CryptoCurrency.NIM][currency.value] || 0);
        const btcExchangeRate = computed(() =>
            exchangeRates.value?.[CryptoCurrency.BTC][currency.value] || 0);

        const nimDistributionData = computed<readonly ExtendedAddressInfo[]>(() =>
            addressInfos.value
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
                    get barColor() {
                        let color = getBackgroundColorName(this.address).toLowerCase() as string;

                        if (color === 'yellow') color = 'gold';
                        else if (color === 'indigo') color = 'blue';
                        else if (color === 'blue') color = 'light-blue';
                        else if (color === 'teal') color = 'green';
                        else if (color === 'green') color = 'light-green';

                        return color;
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
        const $activeBar = ref<HTMLDivElement[] | null>(null);
        const activeBar = computed(() =>
            nimDistributionData.value.find((addressInfo) => addressInfo.active),
        );

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
                There is a lot of issues when updating those in a watcher, or turning them into computed.
                So we're updating them in the render loop until a more optimized way to do it is found.
            */
            updateConnectingLinesWidth();
            updateEquiPointPosition();

            if (!isGrabbing || !$activeBar.value || !$bitcoinBar.value || !activeBar.value || !$el.value) {
                return undefined;
            }

            const cursorPositionDiff = currentCursorPosition - initialCursorPosition;
            initialCursorPosition = currentCursorPosition;

            if (cursorPositionDiff === 0) return undefined;

            const movingDirection = cursorPositionDiff > 0 ? MovingDirection.RIGHT : MovingDirection.LEFT;
            const fiatAmount = (Math.abs(cursorPositionDiff) / $el.value.clientWidth) * totalNewFiatBalance.value;

            const lunaAmount = activeBar.value.balanceChange
                + (((fiatAmount / nimExchangeRate.value) * 1e5) * movingDirection);
            const satoshiAmount = btcDistributionData.value.balanceChange
                + (((fiatAmount / btcExchangeRate.value) * 1e8) * -movingDirection);

            /* Limits */
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

            /* Don't allow to send more than the available balance */
            if (lunaAmount < -(activeBar.value.balance || 0) && movingDirection === MovingDirection.LEFT) {
                return emit(SwapAsset.NIM, -(activeBar.value.balance || 0));
            }
            if (satoshiAmount < -accountBalance.value && movingDirection === MovingDirection.RIGHT) {
                return emit(SwapAsset.BTC, -accountBalance.value);
            }

            /* Otherwise */
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

        /* Equilibrium point */
        const $btcChangeBar = ref<HTMLDivElement | null>(null);
        const $nimChangeBar = ref<HTMLDivElement[] | null>(null);
        const equiPointThreshold = 10;
        const equiPointPositionX = ref(0);
        const equiPointVisible = computed(() =>
            equiPointPositionX.value < equiPointThreshold && equiPointPositionX.value > -equiPointThreshold);
        const animatingBars = ref(false);

        function updateEquiPointPosition() {
            if (!$el.value || !activeBar.value || (!$btcChangeBar.value && !$nimChangeBar.value)) {
                return;
            }

            if (activeBar.value.balanceChange > 0 && $nimChangeBar.value && $nimChangeBar.value.length > 0) {
                equiPointPositionX.value = -$nimChangeBar.value[0].clientWidth;
            } else if (btcDistributionData.value.balanceChange > 0 && $btcChangeBar.value) {
                equiPointPositionX.value = $btcChangeBar.value.clientWidth;
            } else if (equiPointPositionX.value !== 0) {
                equiPointPositionX.value = 0;
            }
        }

        function animatedReset() {
            animatingBars.value = true;
            emit(SwapAsset.NIM, 0);
            setTimeout(() => {
                animatingBars.value = false;
            }, 200);
        }

        return {
            selectAddress,

            $el,
            $activeBar,
            $bitcoinBar,
            $btcChangeBar,
            $nimChangeBar,

            nimDistributionData,
            activeAddressInfo,
            btcDistributionData,

            onMouseDown,
            onMouseUp,
            onMouseMove,
            getNimiqBarWidth,
            getNimiqChangeBarWidth,
            bitcoinBarWidth,
            bitcoinChangeBarWidth,

            nimiqConnectingLineWidth,
            bitcoinConnectingLineWidth,

            nimiqTotalNewFiatBalance,
            distributionPercents,

            equiPointPositionX,
            equiPointVisible,
            animatedReset,
            animatingBars,
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

.swap-balance-bar {
    position: relative;
}

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
            line-height: 2.625rem;
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
    background-color: currentColor;
    border: .25rem solid currentColor;
    opacity: 0.25;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    cursor: pointer;
    transform: translate3d(0, 0, 0);

    transition: opacity 300ms, width 10ms;

    .animating & {
        transition: opacity 300ms, width 300ms;
    }

    &:not(:last-child) {
        margin-right: 0.375rem;
    }

    &:first-child,
    &:last-child {
        border-radius: 1.2rem; // css bug? increasing left border radius decrease the right one... Should be 0.5rem
        --end-border-radius: 5rem;
    }

    &:first-child {
        border-top-left-radius: var(--end-border-radius);
        border-bottom-left-radius: var(--end-border-radius);
    }

    &:last-child {
        border-top-right-radius: var(--end-border-radius);
        border-bottom-right-radius: var(--end-border-radius);
    }

    &.active {
        opacity: 1;
    }

    &.bitcoin {
        background-color: var(--bitcoin-orange);
        border: .25rem solid var(--bitcoin-orange);
        justify-content: flex-start;
    }

    .change {
        background: url('../../assets/swap-change-background.svg') repeat-x top;
        height: 100%;
        border-radius: 0.25rem;
        transition: width 10ms;
        transform: translate3d(0, 0, 0);

        .animating & {
            transition: width 300ms;
        }
    }
}

.separator {
    width: .25rem;
    margin-right: 0.375rem;
    height: 10.5rem;
    position: relative;
    flex-shrink: 0;
    touch-action: none;
    z-index: 2;

    .handle {
        --height: 3rem;
        --width: 3.25rem;

        height: var(--height);
        width: var(--width);
        background: white url('../../assets/horizontal-double-arrow.svg') no-repeat center;
        border-radius: 0.5rem;
        box-shadow:
            0px .5rem 2rem rgba(0, 0, 0, 0.07),
            0px .1875rem .375rem rgba(0, 0, 0, 0.05),
            0px .0421rem .25rem rgba(0, 0, 0, 0.025);

        position: absolute;
        top: calc(50% - (var(--height) / 2));
        left: calc(50% - (var(--width) / 2));
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }
}

.equilibrium-point {
    --translateX: 0;
    height: .5rem;
    width: .5rem;
    border-radius: 50%;
    cursor: pointer;
    position: absolute;
    bottom: .25rem;
    left: 50%;
    transform: translateX(-50%) translateX(var(--translateX));
    opacity: 1;

    transition-duration: 300ms;
    transition-property: opacity, visibility;

    .animating & {
        transition-property: opacity, visibility, transform;
    }

    &.hidden {
        opacity: 0;
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
        letter-spacing: 0.0625rem;
        color: var(--text-50);

        &:not(:last-child) {
            border-right: 0.1875rem solid var(--text-20);
        }

        &:last-child {
            text-align: right;
        }
    }
}

</style>
