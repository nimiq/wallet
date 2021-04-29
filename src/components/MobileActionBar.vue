<template>
    <div class="mobile-action-bar flex-row">
        <button class="receive nq-button-s flex-row" @click="receive" @mousedown.prevent>
            <ArrowRightSmallIcon />{{ $t('Receive') }}
        </button>
        <button class="send nq-button-pill light-blue flex-row"
            @click="send" @mousedown.prevent
            :disabled="sendDisabled"
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
import { useAddressStore } from '../stores/Address';
import { useAccountStore } from '../stores/Account';
import { CryptoCurrency } from '../lib/Constants';
import { useBtcAddressStore } from '../stores/BtcAddress';

export default defineComponent({
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();
        const { activeCurrency } = useAccountStore();
        const { accountBalance } = useBtcAddressStore();

        function nimOrBtc<T>(nim: T, btc: T): T {
            switch (activeCurrency.value) {
                case CryptoCurrency.NIM: return nim;
                case CryptoCurrency.BTC: return btc;
                default: throw new Error('Invalid active currency');
            }
        }

        function receive() {
            context.root.$router.push(nimOrBtc<string>('/receive', '/btc-receive'));
        }

        function send() {
            context.root.$router.push(nimOrBtc<string>('/send', '/btc-send'));
        }

        const sendDisabled = computed(() => nimOrBtc(
            !activeAddressInfo.value || !activeAddressInfo.value.balance,
            !accountBalance.value,
        ));

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
.mobile-action-bar {
    justify-content: space-between;
    align-items: center;
    padding: 2rem;
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

@media (max-width: 700px) { // Full mobile breakpoint
    .mobile-action-bar {
        display: flex;
    }
}
</style>
