<template>
    <div class="swap-balance-bar flex-column" ref="root" :class="{ animating: animatingBars }">
        <div class="balance-bar-header flex-row">
            <button v-if="leftAsset === SwapAsset.NIM" class="reset left nimiq flex-row"
                :class="{ single: backgroundAddresses.length === 0 }"
                @click="onActiveAddressClick"
            >
                <div class="identicon-stack" ref="$nimiqIcon">
                    <Identicon class="secondary" v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>
                    <Identicon class="secondary" v-if="backgroundAddresses[1]" :address="backgroundAddresses[1]"/>
                    <Identicon class="primary" :address="activeAddressInfo.address"/>
                </div>
                <label>{{ activeAddressInfo.label }}</label>
            </button>
            <div v-if="leftAsset === SwapAsset.BTC" class="left bitcoin flex-row">
                <BitcoinIcon ref="$bitcoinIcon"/>
                <label>Bitcoin</label>
            </div>
            <button v-if="rightAsset === SwapAsset.NIM" class="reset right nimiq flex-row"
                :class="{ single: backgroundAddresses.length === 0 }"
                @click="onActiveAddressClick"
            >
                <label>{{ activeAddressInfo.label }}</label>
                <div class="identicon-stack" ref="$nimiqIcon">
                    <Identicon class="secondary" v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>
                    <Identicon class="secondary" v-if="backgroundAddresses[1]" :address="backgroundAddresses[1]"/>
                    <Identicon class="primary" :address="activeAddressInfo.address"/>
                </div>
            </button>
            <div v-if="rightAsset === SwapAsset.BTC" class="right bitcoin flex-row">
                <label>Bitcoin</label>
                <BitcoinIcon ref="$bitcoinIcon"/>
            </div>
        </div>
        <div class="connecting-lines">
            <CurvedLine :width="leftConnectingLineWidth" :height="35" direction="right" />
            <CurvedLine :width="rightConnectingLineWidth" :height="35" direction="left" />
        </div>
        <div class="balance-bar flex-row">
            <div class="bar left flex-row"
                v-for="barDef in leftDistributionData"
                :key="barDef.address"
                :ref="barDef.active ? '$leftActiveBar' : null"
                :class="[{ active: barDef.active }, barDef.barColorClass]"
                :style="{ width: `${getBarWidth(barDef)}%` }"
                @click="barDef.active ? onActiveBarClick(leftAsset, $event) : selectAddress(barDef.address)"
            >
                <div class="change"
                    ref="$leftChangeBar"
                    :style="{ width: `${getChangeBarWidth(barDef)}%` }"
                ></div>
            </div>
            <div class="separator nq-light-blue-bg" ref="$separator">
                <transition name="fade">
                    <SlideHint direction="left" v-if="distributionPercents.right <= 2"/>
                </transition>
                <div class="handle"
                    @mousedown="onMouseDown"
                    @touchstart="onMouseDown"
                ></div>
                <transition name="fade">
                    <SlideHint direction="right" v-if="distributionPercents.left <= 2"/>
                </transition>
            </div>
            <div class="bar right flex-row"
                v-for="barDef in rightDistributionData"
                :key="barDef.address"
                :ref="barDef.active ? '$rightActiveBar' : null"
                :class="[{ active: barDef.active }, barDef.barColorClass]"
                :style="{ width: `${getBarWidth(barDef)}%` }"
                @click="barDef.active ? onActiveBarClick(rightAsset, $event) : selectAddress(barDef.address)"
            >
                <div class="change"
                    ref="$rightChangeBar"
                    :style="{ width: `${getChangeBarWidth(barDef)}%` }"
                ></div>
            </div>
        </div>
        <div class="scale flex-row">
            <div v-for="index in 10" :key="index" class="tenth">
                <div v-if="index === 1"
                    class="left-total-percent"
                    :class="{
                        hidden: distributionPercents.left <= 5 || (equiPointPositionX < 10 && equiPointPositionX > 5),
                    }"
                >{{distributionPercents.left}}%</div>
                <div v-else-if="index === 10"
                    class="right-total-percent"
                    :class="{
                        hidden: distributionPercents.right <= 5 || (equiPointPositionX > 90 && equiPointPositionX < 95),
                    }"
                >{{distributionPercents.right}}%</div>
            </div>
        </div>
        <div class="equilibrium-point nq-light-blue-bg"
            :class="{
                hidden: !equiPointVisible || equiPointPositionX <= 5 || equiPointPositionX >= 95,
            }"
            :style="{ left: `${equiPointPositionX}%` }"
            @click="animatedReset"
        ></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted, ref } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import { SwapAsset } from '@nimiq/fastspot-api';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { useAddressStore } from '../../stores/Address';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import CurvedLine from '../icons/SwapBalanceBar/CurvedLine.vue';
import SlideHint from '../icons/SwapBalanceBar/SlideHint.vue';
import { getColorClass } from '../../lib/AddressColor';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';

type BarDefinition = {
    readonly address: string,
    readonly balance: number,
    readonly active: boolean,
    readonly newFiatBalance: number,
    readonly barColorClass: string,
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
        leftAsset: {
            type: String as () => SwapAsset,
            required: true,
        },
        rightAsset: {
            type: String as () => SwapAsset,
            required: true,
        },
        newLeftBalance: {
            type: Number,
            required: true,
        },
        newRightBalance: {
            type: Number,
            required: true,
        },
        fiatLimit: {
            type: Number,
        },
    },
    setup(props, context) {
        const { addressInfos, selectAddress, activeAddressInfo } = useAddressStore();
        const { accountBalance: btcAccountBalance, availableExternalAddresses } = useBtcAddressStore();
        const { addressInfo: usdcAddressInfo, accountBalance: usdcAccountBalance } = useUsdcAddressStore();
        const { exchangeRates, currency } = useFiatStore();

        const root = ref<HTMLDivElement | null>(null);

        const leftExchangeRate = computed(() =>
            exchangeRates.value?.[props.leftAsset.toLowerCase()][currency.value] || 0);
        const rightExchangeRate = computed(() =>
            exchangeRates.value?.[props.rightAsset.toLowerCase()][currency.value] || 0);

        const leftDistributionData = computed<BarDefinition[]>(() => {
            switch (props.leftAsset) {
                case SwapAsset.NIM:
                    return addressInfos.value.map((addressInfo) => ({
                        ...addressInfo,
                        get active() {
                            return (activeAddressInfo.value?.address === this.address);
                        },
                        get newFiatBalance() {
                            if (!this.active) {
                                return ((this.balance || 0) / 1e5) * leftExchangeRate.value;
                            }

                            return (props.newLeftBalance / 1e5) * leftExchangeRate.value;
                        },
                        get balanceChange() {
                            if (!this.active) return 0;

                            return (props.newLeftBalance - (this.balance || 0));
                        },
                        get fiatBalanceChange() {
                            return (this.balanceChange / 1e5) * leftExchangeRate.value;
                        },
                        get barColorClass() {
                            return getColorClass(this.address);
                        },
                    } as BarDefinition));
                case SwapAsset.BTC:
                    return [{
                        address: availableExternalAddresses.value[0] || 'bitcoin',
                        balance: btcAccountBalance.value,
                        active: true,
                        newFiatBalance: (props.newLeftBalance / 1e8) * leftExchangeRate.value,
                        barColorClass: 'bitcoin',
                        balanceChange: (props.newLeftBalance - btcAccountBalance.value),
                        fiatBalanceChange: ((props.newLeftBalance - btcAccountBalance.value) / 1e8)
                            * leftExchangeRate.value,
                    }];
                case SwapAsset.USDC:
                    return [{
                        address: usdcAddressInfo.value?.address || 'usdc',
                        balance: usdcAccountBalance.value,
                        active: true,
                        newFiatBalance: (props.newLeftBalance / 1e6) * leftExchangeRate.value,
                        barColorClass: 'usdc',
                        balanceChange: (props.newLeftBalance - usdcAccountBalance.value),
                        fiatBalanceChange: ((props.newLeftBalance - usdcAccountBalance.value) / 1e6)
                            * leftExchangeRate.value,
                    }];
                default:
                    throw new Error('Invalid leftAsset');
            }
        });
        const rightDistributionData = computed<BarDefinition[]>(() => {
            switch (props.rightAsset) {
                case SwapAsset.NIM:
                    return addressInfos.value.map((addressInfo) => ({
                        ...addressInfo,
                        get active() {
                            return (activeAddressInfo.value?.address === this.address);
                        },
                        get newFiatBalance() {
                            if (!this.active) {
                                return ((this.balance || 0) / 1e5) * rightExchangeRate.value;
                            }

                            return (props.newRightBalance / 1e5) * rightExchangeRate.value;
                        },
                        get balanceChange() {
                            if (!this.active) return 0;

                            return (props.newRightBalance - (this.balance || 0));
                        },
                        get fiatBalanceChange() {
                            return (this.balanceChange / 1e5) * rightExchangeRate.value;
                        },
                        get barColorClass() {
                            return getColorClass(this.address);
                        },
                    } as BarDefinition));
                case SwapAsset.BTC:
                    return [{
                        address: availableExternalAddresses.value[0] || 'bitcoin',
                        balance: btcAccountBalance.value,
                        active: true,
                        newFiatBalance: (props.newRightBalance / 1e8) * rightExchangeRate.value,
                        barColorClass: 'bitcoin',
                        balanceChange: (props.newRightBalance - btcAccountBalance.value),
                        fiatBalanceChange: ((props.newRightBalance - btcAccountBalance.value) / 1e8)
                            * rightExchangeRate.value,
                    }];
                case SwapAsset.USDC:
                    return [{
                        address: usdcAddressInfo.value?.address || 'usdc',
                        balance: usdcAccountBalance.value,
                        active: true,
                        newFiatBalance: (props.newRightBalance / 1e6) * rightExchangeRate.value,
                        barColorClass: 'usdc',
                        balanceChange: (props.newRightBalance - usdcAccountBalance.value),
                        fiatBalanceChange: ((props.newRightBalance - usdcAccountBalance.value) / 1e6)
                            * rightExchangeRate.value,
                    }];
                default:
                    throw new Error('Invalid rightAsset');
            }
        });
        const leftTotalNewFiatBalance = computed(() => {
            if (props.leftAsset === SwapAsset.NIM) {
                return leftDistributionData.value.reduce((sum, data) => sum + data.newFiatBalance, 0);
            }
            return leftDistributionData.value[0].newFiatBalance;
        });
        const rightTotalNewFiatBalance = computed(() => {
            if (props.rightAsset === SwapAsset.NIM) {
                return rightDistributionData.value.reduce((sum, data) => sum + data.newFiatBalance, 0);
            }
            return rightDistributionData.value[0].newFiatBalance;
        });
        const totalNewFiatBalance = computed(() =>
            leftTotalNewFiatBalance.value + rightTotalNewFiatBalance.value,
        );
        const distributionPercents = computed(() => ({
            left: Math.round((leftTotalNewFiatBalance.value / totalNewFiatBalance.value) * 100),
            right: Math.round((rightTotalNewFiatBalance.value / totalNewFiatBalance.value) * 100),
        }));

        // handle behavior
        let isGrabbing = false;
        let initialCursorPosition = 0;
        let currentCursorPosition = 0;
        let animationFrameHandle = 0;

        const $leftActiveBar = ref<HTMLDivElement[] | null>(null);
        const $rightActiveBar = ref<HTMLDivElement[] | null>(null);
        const leftActiveBar = computed(() =>
            leftDistributionData.value.find((def) => def.active)!,
        );
        const rightActiveBar = computed(() =>
            rightDistributionData.value.find((def) => def.active)!,
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

        const DECIMALS = {
            [SwapAsset.NIM]: 5,
            [SwapAsset.BTC]: 8,
            [SwapAsset.USDC]: 6,
            [SwapAsset.EUR]: 2, // For TS completeness
        } as const;

        function updateSwapBalanceBar(cursorPosition?: number) {
            if (
                (!isGrabbing && !cursorPosition)
                || !$leftActiveBar.value
                || !$rightActiveBar.value
                || !leftActiveBar.value
                || !leftActiveBar.value
                || !root.value
                || !$separator.value
            ) {
                return undefined;
            }

            const separatorPositionX = $separator.value.getBoundingClientRect().left;

            /* initialize the initialCursorPosition to the handle/separator position if not set yet */
            if (initialCursorPosition === 0) initialCursorPosition = separatorPositionX;

            const cursorPositionDiff = (cursorPosition || currentCursorPosition) - initialCursorPosition;
            initialCursorPosition = (cursorPosition || currentCursorPosition);

            if (cursorPositionDiff === 0) return undefined;

            const movingDirection = cursorPositionDiff > 0 ? MovingDirection.RIGHT : MovingDirection.LEFT;
            const cursorSeparatorPositionDiff = (cursorPosition || currentCursorPosition) - separatorPositionX;

            /* Prevent moving the handle if the mouse is not above it anymore */
            if (cursorSeparatorPositionDiff < 0 && movingDirection === MovingDirection.RIGHT) return undefined;
            if (cursorSeparatorPositionDiff > 0 && movingDirection === MovingDirection.LEFT) return undefined;

            const leftCoinsToUnits = 10 ** DECIMALS[props.leftAsset];
            const rightCoinsToUnits = 10 ** DECIMALS[props.rightAsset];

            /* Amounts calculation */
            const fiatAmount = (Math.abs(cursorSeparatorPositionDiff) / root.value.clientWidth)
                * totalNewFiatBalance.value;
            const leftUnits = leftActiveBar.value.balanceChange
                + (((fiatAmount / leftExchangeRate.value) * leftCoinsToUnits) * movingDirection);
            const rightUnits = rightActiveBar.value.balanceChange
                + (((fiatAmount / rightExchangeRate.value) * rightCoinsToUnits) * -movingDirection);

            /* Limits */
            if (props.fiatLimit && typeof props.fiatLimit === 'number') {
                if ((leftUnits / leftCoinsToUnits) * leftExchangeRate.value < -props.fiatLimit
                    && movingDirection === MovingDirection.LEFT) {
                    return emit(props.leftAsset, -(props.fiatLimit / leftExchangeRate.value) * leftCoinsToUnits);
                }
                if ((rightUnits / rightCoinsToUnits) * rightExchangeRate.value < -props.fiatLimit
                    && movingDirection === MovingDirection.RIGHT) {
                    return emit(props.rightAsset, -(props.fiatLimit / rightExchangeRate.value) * rightCoinsToUnits);
                }
            }

            /* Don't allow to send more than the available balance */
            if (leftUnits < -(leftActiveBar.value.balance || 0) && movingDirection === MovingDirection.LEFT) {
                return emit(props.leftAsset, -(leftActiveBar.value.balance || 0));
            }
            if (rightUnits < -(rightActiveBar.value.balance || 0) && movingDirection === MovingDirection.RIGHT) {
                return emit(props.rightAsset, -(rightActiveBar.value.balance || 0));
            }

            /* Otherwise, normal behavior */
            if (leftUnits <= 0) {
                return emit(props.leftAsset, leftUnits);
            }
            return emit(props.rightAsset, rightUnits);
        }

        function render(): void {
            animationFrameHandle = requestAnimationFrame(render);

            updateSwapBalanceBar();

            /*
                There is a lot of issues when updating those in a watcher, or turning them into computed.
                So we're updating them in the render loop until a more optimized way to do it is found.
            */
            updateConnectingLinesWidth();
            updateEquiPointVisibility();
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
        const widthToSubstractPercent = computed(() => Math.round(
            root.value ? (((0.625 * remSize.value) // separator right margin & width
            + ((leftDistributionData.value.length - 1) * (0.875 * remSize.value))) // bar right margin & border width
            / root.value.offsetWidth) * 100 : 0,
        ) / 100);

        const getBarWidth = (barDef: BarDefinition) =>
            (barDef.newFiatBalance / (totalNewFiatBalance.value * (1 + widthToSubstractPercent.value))) * 100;
        const getChangeBarWidth = (barDef: BarDefinition) =>
            barDef.balanceChange > 0
                ? (barDef.fiatBalanceChange / barDef.newFiatBalance) * 100
                : 0;

        /* Connecting lines between icon and active bar */
        const remSize = computed(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
        const leftConnectingLineWidth = ref(0);
        const rightConnectingLineWidth = ref(0);

        function updateConnectingLinesWidth() {
            if ($leftActiveBar.value && $leftActiveBar.value[0].parentElement) {
                leftConnectingLineWidth.value = ($leftActiveBar.value[0].offsetWidth / 2)
                    + ($leftActiveBar.value[0].offsetLeft) - (remSize.value * 2.5);
            }

            if ($rightActiveBar.value) {
                rightConnectingLineWidth.value = ($rightActiveBar.value[0].offsetWidth / 2) - (remSize.value * 2.5);
            }
        }

        /* Equilibrium point */
        const $separator = ref<HTMLDivElement | null>(null);
        const $leftChangeBar = ref<HTMLDivElement[] | null>(null);
        const $rightChangeBar = ref<HTMLDivElement[] | null>(null);
        const equiPointThreshold = 8;
        const equiPointPositionX = ref(0);
        const equiPointVisible = ref(false);
        const animatingBars = ref(false);

        function updateEquiPointVisibility() {
            if (!root.value || !$separator.value) {
                return;
            }

            const { offsetLeft } = $separator.value;

            /* hide the point if close to the handle/separator */
            if (equiPointPositionX.value < ((offsetLeft + equiPointThreshold) / root.value.offsetWidth) * 100
                && equiPointPositionX.value > ((offsetLeft - equiPointThreshold) / root.value.offsetWidth) * 100) {
                equiPointVisible.value = false;
            } else {
                equiPointVisible.value = true;
            }
        }

        onMounted(() => {
            const { offsetLeft } = $separator.value!;
            equiPointPositionX.value = (offsetLeft / root.value!.offsetWidth) * 100;
        });

        function animatedReset() {
            animatingBars.value = true;
            emit(props.leftAsset, 0);
            setTimeout(() => {
                animatingBars.value = false;
            }, 200);
        }

        /* For the .identicon-stack */
        const backgroundAddresses = computed(() =>
            // TODO: show next/first & previous/last address
            addressInfos.value
                .filter((addressInfo) => addressInfo.address !== activeAddressInfo.value!.address)
                .slice(0, 2)
                .map((addressInfo) => addressInfo.address),
        );

        /* Emit click on active address for address selector overlay */
        function onActiveAddressClick() {
            if (!backgroundAddresses.value || backgroundAddresses.value.length === 0) return;

            context.emit('onActiveAddressClick');
        }

        /* Move the separator to the cursor position or limit on click on an active bar */
        let activeBarClickTimeoutId = 0;
        function onActiveBarClick(asset: SwapAsset, event: MouseEvent) {
            if (!$separator.value || !event.target || !Object.values(SwapAsset).includes(asset)) {
                return;
            }

            clearTimeout(activeBarClickTimeoutId);
            animatingBars.value = true;

            if (asset === props.leftAsset) {
                const posX = $separator.value.getBoundingClientRect().left
                    - ((event.target as HTMLElement).offsetWidth - event.offsetX);

                updateSwapBalanceBar(posX);
            } else if (asset === props.rightAsset) {
                const posX = $separator.value.getBoundingClientRect().right + event.offsetX;
                updateSwapBalanceBar(posX);
            }

            activeBarClickTimeoutId = window.setTimeout(() => {
                animatingBars.value = false;
            }, 200);
        }

        return {
            SwapAsset,

            /* store methods */
            selectAddress,

            /* HTML elements */
            root,
            $leftActiveBar,
            $rightActiveBar,
            $rightChangeBar,
            $leftChangeBar,
            $separator,

            /* distribution data */
            activeAddressInfo,
            leftDistributionData,
            rightDistributionData,

            /* Base slider (bars / separator) behavior */
            onMouseDown,
            onMouseUp,
            onMouseMove,
            getBarWidth,
            getChangeBarWidth,

            /* Connecting lines */
            leftConnectingLineWidth,
            rightConnectingLineWidth,

            /* Scale / distribution percents */
            distributionPercents,

            /* Equilibrium point */
            equiPointPositionX,
            equiPointVisible,
            animatedReset,
            animatingBars,

            /* Address selector / identicon stack */
            onActiveAddressClick,
            backgroundAddresses,

            /* Move separator/handle on active bar click */
            onActiveBarClick,
        };
    },
    components: {
        BitcoinIcon,
        Identicon,
        CurvedLine,
        SlideHint,
    },
});
</script>

<style lang="scss" scoped>

.swap-balance-bar {
    position: relative;
}

.balance-bar-header {
    --header-height: 5.25rem;
    height: var(--header-height);

    & > * {
        flex-grow: 1;
        align-items: center;

        label {
            font-weight: 600;
            line-height: 2.625rem;
        }
    }
}

.balance-bar-header .nimiq {
    flex-grow: 0;
    max-width: 65%;
    position: relative;

    &:not(.single) {
        &:before {
            content: "";
            border-radius: 0.75rem;
            position: absolute;
            top: -.5rem;
            bottom: -.5rem;
            left: -.5rem;
            right: -.5rem;
            background: transparent;

            transition: background 400ms;
        }

        &:hover:before {
            background: var(--nimiq-highlight-bg);
        }
    }

    &.single {
        cursor: default;
    }

    label {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        cursor: inherit;
    }

    &.left {
        label {
            margin-right: 1rem;
        }

        .identicon-stack {
            margin-right: 1.5rem;
            margin-left: 1rem;
        }
    }

    &.right {
        justify-content: flex-end;

        label {
            margin-left: 1rem;
        }

        .identicon-stack {
            margin-right: 1rem;
            margin-left: 1.5rem;
        }
    }
}

.balance-bar-header .bitcoin {
    svg {
        color: var(--bitcoin-orange);
    }

    &.left {
        svg {
            margin-right: 2rem;
        }
    }

    &.right {
        justify-content: flex-end;

        svg {
            margin-left: 2rem;
        }
    }
}

.identicon-stack {
    align-items: stretch;
    position: relative;
    overflow: visible;

    .identicon {
        height: auto;
    }

    .primary {
        position: relative;
        width: var(--header-height);
    }

    .secondary {
        width: 4.75rem;
        position: absolute;
        top: 50%;

        opacity: 0.4;
        transform: translateY(-50%) translateX(0);

        transition:
            transform 300ms var(--nimiq-ease),
            opacity 300ms var(--nimiq-ease);

        &:first-child {
            left: 1.5rem;
        }

        &:nth-child(2) {
            right: 1.5rem;
        }
    }

    .nimiq:hover &,
    .nimiq:focus & {
        .secondary:first-child {
            transform: translateY(-50%) translateX(-0.375rem) scale(1.05);
            opacity: 0.5;
        }

        .secondary:nth-child(2) {
            transform: translateY(-50%) translateX(0.375rem) scale(1.05);
            opacity: 0.5;
        }
    }
}

.connecting-lines {
    margin-top: .5rem;
    margin-bottom: -3rem;
    padding-left: 3.5rem;

    svg:last-child {
        position: absolute;
        right: 2.5rem;
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
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    cursor: pointer;
    transform: translate3d(0, 0, 0);

    transition: opacity 300ms;

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
        cursor: default;
    }

    &.bitcoin {
        background-color: var(--bitcoin-orange);
        border: .25rem solid var(--bitcoin-orange);
    }

    .change {
        background: url('../../assets/swap-change-background.svg') repeat-x top left;
        background-size: auto 100%;
        height: 100%;
        border-radius: 0.25rem;
        transform: translate3d(0, 0, 0);

        .animating & {
            transition: width 300ms;
        }
    }

    &.left {
        justify-content: flex-end;

        .change {
            background-position: top left;
        }
    }

    &.right {
        justify-content: flex-start;

        .change {
            background-position: top right;
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
    height: .5rem;
    width: .5rem;
    border-radius: 50%;
    cursor: pointer;
    position: absolute;
    bottom: .25rem;
    opacity: 1;

    transition: opacity 0.3s var(--nimiq-ease);

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
        font-size: 1.625rem;
        letter-spacing: 0.0625rem;
        color: var(--text-50);

        &:not(:last-child) {
            border-right: 0.1875rem solid var(--text-20);
        }

        &:last-child {
            text-align: right;
        }

        & > div {
            transition-property: visibility, opacity;
            transition-duration: 300ms;

            &.hidden {
                opacity: 0;
            }
        }
    }
}

</style>
