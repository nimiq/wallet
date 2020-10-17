<template>
    <div class="swap-balance-bar">
        <div class="bar"
            v-for="addressInfo in nimDistributionData"
            :key="addressInfo.address"
            ref="bars"
            :class="[{ active: addressInfo.active }, addressInfo.backgroundClass]"
            :style="{ width: `${getBarWidth(addressInfo)}%` }"
            @click="selectAddress(addressInfo.address)"
        >
            <div class="change"
                v-if="addressInfo.active && addressInfo.balanceChange > 0"
                :style="{ width: `${getNimChangeBarWidth(addressInfo)}%` }"
            ></div>
        </div>
        <div class="separator nq-light-blue-bg">
            <div class="handle"
                @mousedown="onMouseDown"
            ></div>
        </div>
        <div class="bar bitcoin active"
            ref="bitcoinBar"
            :style="{ width: `${getBitcoinBarWidth()}%` }"
        >
            <div class="change" v-if="btcDistributionData.balanceChange > 0"
                :style="{ width: `${getBitcoinChangeBarWidth()}%` }"
            ></div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, onUnmounted, ref, Ref } from '@vue/composition-api';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency } from '../../lib/Constants';
import { useAddressStore, AddressInfo } from '../../stores/Address';
import getBackgroundClass from '../../lib/AddressColor';
import { SwapDirection } from '../../stores/Swaps';

type ExtendedAddressInfo = AddressInfo & {
    readonly active: boolean,
    readonly newFiatBalance: number,
    readonly backgroundClass: string,
    readonly balanceChange: number,
    readonly fiatBalanceChange: number,
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
        const { addressInfos, activeAddress, selectAddress } = useAddressStore();
        const { accountBalance } = useBtcAddressStore();
        const { exchangeRates, currency } = useFiatStore();

        const nimExchangeRate = computed(() =>
            exchangeRates.value?.[CryptoCurrency.NIM][currency.value] || 0);
        const btcExchangeRate = computed(() =>
            exchangeRates.value?.[CryptoCurrency.BTC][currency.value] || 0);

        const nimDistributionData = computed(() =>
            addressInfos.value
                // .filter((addressInfo) => addressInfo.type === 0) // filter no Vesting or Htlc account types
                .map((addressInfo) => ({
                    ...addressInfo,
                    get active() {
                        return (activeAddress.value === this.address);
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
                        return getBackgroundClass((this as AddressInfo).address);
                    },
                } as ExtendedAddressInfo)),
        );

        const btcDistributionData = computed(() => ({
            newFiatBalance: (props.newBtcBalance / 1e8) * btcExchangeRate.value,
            balanceChange: (props.newBtcBalance - accountBalance.value),
            fiatBalanceChange: ((props.newBtcBalance - accountBalance.value) / 1e8) * btcExchangeRate.value,
        }));

        const totalBalance = computed(() =>
            nimDistributionData.value.reduce((sum, data) => sum + data.newFiatBalance, 0)
                + btcDistributionData.value.newFiatBalance,
        );

        // handle behavior
        let isGrabbing = false;
        let initialCursorPosition = 0;
        let currentCursorPosition = 0;
        let cursorPositionDiff = 0;
        let animationFrameHandle = 0;

        function onMouseDown(event: MouseEvent) {
            isGrabbing = true;
            initialCursorPosition = event.pageX;
            currentCursorPosition = event.pageX;
        }

        function onMouseUp(/* event: MouseEvent */) {
            if (isGrabbing) {
                isGrabbing = false;
            }
        }

        function onMouseMove(event: MouseEvent) {
            if (!isGrabbing) return;

            currentCursorPosition = event.pageX;
        }

        const RIGHT = 1;
        const LEFT = -1;
        const direction = ref<SwapDirection | null>(null);

        function render() {
            animationFrameHandle = requestAnimationFrame(render);

            if (!isGrabbing) return;

            cursorPositionDiff = currentCursorPosition - initialCursorPosition;

            if (cursorPositionDiff === 0) return;

            const movingDirection = cursorPositionDiff > 0 ? RIGHT : LEFT;

            const $bitcoinBar = (context.refs.bitcoinBar as HTMLDivElement);
            const activeBar = nimDistributionData.value.find((addressInfo) => addressInfo.active)!;
            const $activeBar = Array.from(context.refs.bars as HTMLDivElement[])
                .find((bar) => bar.classList.contains('active'))!;

            const nimPercent = Math.min(Math.max(Math.abs(cursorPositionDiff) / $activeBar.clientWidth, 0), 1);
            const btcPercent = Math.min(Math.max(Math.abs(cursorPositionDiff) / $bitcoinBar.clientWidth, 0), 1);

            let lunaAmount = Math.abs(activeBar.balanceChange)
                + ((props.newNimBalance * nimPercent) * movingDirection);
            let satoshiAmount = Math.abs(btcDistributionData.value.balanceChange)
                + ((props.newBtcBalance * btcPercent) * -movingDirection);

            if (movingDirection === RIGHT && btcDistributionData.value.balanceChange > 0 && satoshiAmount > 0) {
                direction.value = SwapDirection.NIM_TO_BTC;
            } else if (movingDirection === RIGHT) {
                direction.value = SwapDirection.BTC_TO_NIM;
            } else if (movingDirection === LEFT && activeBar.balanceChange > 0 && lunaAmount > 0) {
                direction.value = SwapDirection.BTC_TO_NIM;
            } else if (movingDirection === LEFT) {
                direction.value = SwapDirection.NIM_TO_BTC;
            }

            if (props.limits && props.limits.fiat) {
                if ((
                    (((lunaAmount / 1e5) * nimExchangeRate.value) > props.limits.fiat)
                    || (((satoshiAmount / 1e8) * btcExchangeRate.value) > props.limits.fiat)
                ) && (
                    (direction.value === SwapDirection.NIM_TO_BTC && movingDirection === LEFT)
                    || (direction.value === SwapDirection.BTC_TO_NIM && movingDirection === RIGHT)
                )) {
                    lunaAmount = (props.limits.fiat / nimExchangeRate.value) * 1e5;
                    satoshiAmount = (props.limits.fiat / btcExchangeRate.value) * 1e8;
                }
            }

            if (
                lunaAmount > (activeBar.balance || 0)
                && direction.value === SwapDirection.NIM_TO_BTC
                && movingDirection === LEFT
            ) {
                lunaAmount = (activeBar.balance || 0);
                satoshiAmount = (lunaAmount / 1e5) * props.satsPerNim;
            } else if (
                satoshiAmount > accountBalance.value
                && direction.value === SwapDirection.BTC_TO_NIM
                && movingDirection === RIGHT
            ) {
                satoshiAmount = accountBalance.value;
                lunaAmount = (satoshiAmount / props.satsPerNim) * 1e5;
            }

            context.emit('change', {
                direction: direction.value,
                amount: {
                    btc: Math.floor(Math.abs(satoshiAmount)),
                    nim: Math.floor(Math.abs(lunaAmount)),
                },
            });

            initialCursorPosition = currentCursorPosition;
        }

        onMounted(() => {
            document.body.addEventListener('mouseup', onMouseUp);
            document.body.addEventListener('mousemove', onMouseMove);
            render();
        });

        onUnmounted(() => {
            document.body.removeEventListener('mouseup', onMouseUp);
            document.body.removeEventListener('mousemove', onMouseMove);
            cancelAnimationFrame(animationFrameHandle);
        });

        const getBarWidth = (addressInfo: ExtendedAddressInfo) => {
            if (!addressInfo.active) {
                return (addressInfo.newFiatBalance / totalBalance.value) * 100;
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                return ((addressInfo.newFiatBalance) / totalBalance.value) * 100;
            }
            return ((addressInfo.newFiatBalance) / totalBalance.value) * 100;
        };

        const getNimChangeBarWidth = (addressInfo: ExtendedAddressInfo) =>
            ((addressInfo.fiatBalanceChange) / (addressInfo.newFiatBalance)) * 100;

        const getBitcoinBarWidth = () =>
            ((btcDistributionData.value.newFiatBalance) / totalBalance.value) * 100;

        const getBitcoinChangeBarWidth = () =>
            ((btcDistributionData.value.fiatBalanceChange) / (btcDistributionData.value.newFiatBalance)) * 100;

        return {
            SwapDirection,
            addressInfos,
            nimDistributionData,
            activeAddress,
            totalBalance,
            btcDistributionData,
            selectAddress,
            onMouseDown,
            onMouseUp,
            onMouseMove,
            getBarWidth,
            getNimChangeBarWidth,
            getBitcoinBarWidth,
            getBitcoinChangeBarWidth,
        };
    },
});
</script>

<style lang="scss" scoped>

.swap-balance-bar {
    display: flex;
    flex-direction: row;
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
        background-color: #F7931A; /* Bitcoin orange */
        justify-content: flex-start;
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

</style>
