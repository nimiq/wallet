<template>
    <div class="mobile-action-bar flex-row">
        <button class="receive nq-button-s flex-row" @click="receive" @mousedown.prevent>
            <ArrowRightSmallIcon />{{ $t('Receive') }}
        </button>
        <button
            class="send nq-button-pill light-blue flex-row"
            @click="send"
            @mousedown.prevent
            :disabled="sendDisabled"
        >
            <ArrowRightSmallIcon />{{ $t('Send') }}
        </button>
        <button class="reset scan-qr" @click="$router.push({ name: RouteName.Scan })">
            <ScanQrCodeIcon />
        </button>
    </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia';
import { defineComponent, computed } from 'vue';
import { useConfig } from '@/composables/useConfig';
import { useRouter, RouteName } from '@/router';
import { ColumnType, useActiveMobileColumn } from '../composables/useActiveMobileColumn';
import { useWindowSize } from '../composables/useWindowSize';
import { CryptoCurrency } from '../lib/Constants';
import { useAccountStore } from '../stores/Account';
import { useAccountSettingsStore } from '../stores/AccountSettings';
import { AddressType, useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import ArrowRightSmallIcon from './icons/ArrowRightSmallIcon.vue';
import ScanQrCodeIcon from './icons/ScanQrCodeIcon.vue';

export default defineComponent({
    setup() {
        const router = useRouter();
        const { activeAddressInfo, accountAddressInfos: addressInfos } = storeToRefs(useAddressStore());
        const { activeCurrency, activeAccountInfo, hasBitcoinAddresses } = storeToRefs(useAccountStore());
        const { stablecoin } = storeToRefs(useAccountSettingsStore());
        const { accountBalance: btcBalance } = storeToRefs(useBtcAddressStore());
        const { accountUsdcBalance, accountUsdtBridgedBalance } = storeToRefs(usePolygonAddressStore());
        const { isMobile } = useWindowSize();
        const { activeMobileColumn } = useActiveMobileColumn();

        function nimOrBtcOrStable<T>(nim: T, btc: T, stable: T): T {
            switch (activeCurrency.value) {
                case CryptoCurrency.NIM:
                    return nim;
                case CryptoCurrency.BTC:
                    return btc;
                case CryptoCurrency.USDC:
                case CryptoCurrency.USDT:
                    return stable;
                default:
                    throw new Error('Invalid active currency');
            }
        }

        const hasMultipleReceivableAddresses = computed(
            () => addressInfos.value.filter(({ type }) => type === AddressType.BASIC).length > 1,
        );

        function receive() {
            if (
                isMobile.value
                && activeMobileColumn.value !== ColumnType.ADDRESS
                && (hasMultipleReceivableAddresses.value || hasBitcoinAddresses.value)
            ) {
                // redirect to the address selector
                router.push({ name: RouteName.Receive });
            } else {
                router.push({
                    name: nimOrBtcOrStable(
                        RouteName.ReceiveNim,
                        RouteName.ReceiveBtc,
                        stablecoin.value === CryptoCurrency.USDT ? RouteName.ReceiveUsdt : RouteName.ReceiveUsdc,
                    ),
                });
            }
        }

        const hasMultipleSendableAddresses = computed(
            () => activeAccountInfo.value && activeAccountInfo.value.addresses.length > 1,
        );

        function send() {
            if (
                isMobile.value
                && activeMobileColumn.value !== ColumnType.ADDRESS
                && (hasMultipleSendableAddresses.value || hasBitcoinAddresses.value)
            ) {
                // redirect to the address selector
                router.push({ name: RouteName.Send });
            } else {
                router.push({
                    name: nimOrBtcOrStable(
                        RouteName.SendNim,
                        RouteName.SendBtc,
                        stablecoin.value === CryptoCurrency.USDT ? RouteName.SendUsdt : RouteName.SendUsdc,
                    ),
                });
            }
        }

        const { config } = useConfig();

        const sendDisabled = computed(() => {
            if (config.disableNetworkInteraction && activeCurrency.value === CryptoCurrency.NIM) return true;
            return (
                router.currentRoute.path !== '/'
                && nimOrBtcOrStable(
                    !activeAddressInfo.value || !activeAddressInfo.value.balance,
                    !btcBalance.value,
                    stablecoin.value === CryptoCurrency.USDC
                        ? !accountUsdcBalance.value
                        : stablecoin.value === CryptoCurrency.USDT
                          ? !accountUsdtBridgedBalance.value
                          : true,
                )
            );
        });

        return {
            receive,
            send,
            sendDisabled,
            RouteName,
        };
    },
    components: {
        ArrowRightSmallIcon,
        ScanQrCodeIcon,
    },
});
</script>

<style lang="scss" scoped>
@use '../scss/variables.scss' as *;

.mobile-action-bar {
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    padding: 2rem;
    padding-bottom: max(2rem, env(safe-area-inset-bottom));
    background: white;

    display: none;
}

.send,
.receive {
    margin: 0;
    justify-content: center;
    align-items: center;

    padding: 1.5rem 0;
    flex-grow: 1;
    height: unset;
    line-height: 1;
    border-radius: 500px;
    font-size: 2rem;

    .nq-icon {
        font-size: 1.75rem;
        margin-right: 1rem;
    }

    &:disabled {
        pointer-events: none;
        background: rgba(131, 131, 131, 0.07);
        color: #b5b6c1;
    }
}

.send {
    margin-left: 1rem;

    .nq-icon {
        transform: rotateZ(-90deg);
    }
}

.receive .nq-icon {
    transform: rotateZ(90deg);
}

.scan-qr {
    padding: 0.5rem;
    font-size: 4rem;
    opacity: 0.4;
    margin-left: 2rem;
}

@media (max-width: $mobileBreakpoint) {
    // Full mobile breakpoint
    .mobile-action-bar {
        display: flex;
    }
}
</style>
