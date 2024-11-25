<template>
    <div class="mobile-action-bar flex-row">
        <button class="receive nq-button-s flex-row" @click="receive" @mousedown.prevent>
            <ArrowRightSmallIcon />{{ $t('Receive') }}
        </button>
        <button class="send nq-button-pill light-blue flex-row"
            @click="send" @mousedown.prevent
            :disabled="$config.disableNetworkInteraction || sendDisabled"
        >
            <ArrowRightSmallIcon />{{ $t('Send') }}
        </button>
        <button class="reset scan-qr" @click="$router.push('/scan')">
            <ScanQrCodeIcon/>
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon, ScanQrCodeIcon } from '@nimiq/vue-components';
import { AddressType, useAddressStore } from '../stores/Address';
import { useAccountStore } from '../stores/Account';
import { CryptoCurrency } from '../lib/Constants';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { useWindowSize } from '../composables/useWindowSize';
import { ColumnType, useActiveMobileColumn } from '../composables/useActiveMobileColumn';
import { usePolygonAddressStore } from '../stores/PolygonAddress';
import { useAccountSettingsStore } from '../stores/AccountSettings';

export default defineComponent({
    setup(props, context) {
        const { activeAddressInfo, addressInfos } = useAddressStore();
        const { activeCurrency, activeAccountInfo, hasBitcoinAddresses } = useAccountStore();
        const { stablecoin } = useAccountSettingsStore();
        const { accountBalance: btcBalance } = useBtcAddressStore();
        const { accountUsdcBalance, accountUsdtBridgedBalance } = usePolygonAddressStore();
        const { isMobile } = useWindowSize();
        const { activeMobileColumn } = useActiveMobileColumn();

        function nimOrBtcOrStable<T>(nim: T, btc: T, stable: T): T {
            switch (activeCurrency.value) {
                case CryptoCurrency.NIM: return nim;
                case CryptoCurrency.BTC: return btc;
                case CryptoCurrency.USDC:
                case CryptoCurrency.USDT:
                    return stable;
                default: throw new Error('Invalid active currency');
            }
        }

        const hasMultipleReceivableAddresses = computed(() => (
            addressInfos.value.filter(({ type }) => type === AddressType.BASIC).length > 1));

        function receive() {
            if (isMobile.value
                && activeMobileColumn.value !== ColumnType.ADDRESS
                && (hasMultipleReceivableAddresses.value || hasBitcoinAddresses.value)
            ) {
                // redirect to the address selector
                context.root.$router.push('/receive');
            } else {
                context.root.$router.push(nimOrBtcOrStable('/receive/nim', '/receive/btc', '/receive/usdc'));
            }
        }

        const hasMultipleSendableAddresses = computed(() =>
            activeAccountInfo.value && activeAccountInfo.value.addresses.length > 1);

        function send() {
            if (isMobile.value
                && activeMobileColumn.value !== ColumnType.ADDRESS
                && (hasMultipleSendableAddresses.value || hasBitcoinAddresses.value)
            ) {
                // redirect to the address selector
                context.root.$router.push('/send');
            } else {
                context.root.$router.push(nimOrBtcOrStable('/send/nim', '/send/btc', '/send/usdc'));
            }
        }

        const sendDisabled = computed(() =>
            context.root.$route.path !== '/' && nimOrBtcOrStable(
                !activeAddressInfo.value || !activeAddressInfo.value.balance,
                !btcBalance.value,
                (stablecoin.value === CryptoCurrency.USDC
                    ? !accountUsdcBalance.value
                    : stablecoin.value === CryptoCurrency.USDT
                        ? !accountUsdtBridgedBalance.value
                        : true),
            ),
        );

        return {
            receive,
            send,
            sendDisabled,
        };
    },
    components: {
        ArrowRightSmallIcon,
        ScanQrCodeIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.mobile-action-bar {
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    padding: 2rem;
    padding-bottom: max(2rem, env(safe-area-inset-bottom));
    background: white;

    display: none;
}

.send, .receive {
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
        color: #B5B6C1;
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

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .mobile-action-bar {
        display: flex;
    }
}
</style>
