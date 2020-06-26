<template>
    <div class="testnet-faucet flex-column">
        <div v-if="unavailableMsg" class="unavailable nq-orange"><CrossIcon/>{{ unavailableMsg }}</div>

        <!-- <transition name="fade"> -->
            <button v-if="!loading && !errorMsg" class="nq-button green" :disabled="!canTap" @click="tap">
                {{ $t('Receive free NIM') }}
            </button>
            <CircleSpinner v-else-if="!errorMsg"/>
            <div v-else class="error nq-red"><CrossIcon/>{{ errorMsg }}</div>
        <!-- </transition> -->
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, Ref } from '@vue/composition-api';
import { CircleSpinner, CrossIcon } from '@nimiq/vue-components';
import { LocaleMessage } from 'vue-i18n';
import { MAINNET_ORIGIN } from '../lib/Constants';

type FaucetInfoResponse = {
    network: 'test' | 'main',
    address: string,
    balance: number,
    dispenseAmount: number, // NIM
    dispensesRemaining: number,
    availableInRegion: boolean,
};

type FaucetTapResponse = {
    success: false,
    msg: string,
    error: 'VAPTCHA_UNAVAILABLE'
        | 'INVALID_CAPTCHA'
        | 'INVALID_ADDRESS'
        | 'RATE_LIMIT'
        | 'GEOBLOCKED'
        | 'OUT_OF_FUNDS'
        | 'TRANSACTION_FAILED',
} | {
    success: true,
    msg: string,
    expectedBlocks: number,
};

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
    },
    setup(props, context) {
        const canTap = ref(true); // Expect the faucet to be available
        const unavailableMsg: Ref<LocaleMessage> = ref('');
        const errorMsg: Ref<LocaleMessage> = ref('');
        const loading = ref(false);

        // Only the testnet faucet is supported, because this component does not implement RECAPTCHA/VAPTCHA
        const FAUCET_URL = 'https://faucet.nimiq-testnet.com';

        const faucetInfoPromise = fetch(`${FAUCET_URL}/info`)
            .then((res) => res.json() as Promise<FaucetInfoResponse>)
            .then((faucet) => {
                const expectedNetwork = window.location.origin === MAINNET_ORIGIN ? 'main' : 'test';

                if (faucet.network !== expectedNetwork) {
                    unavailableMsg.value = context.root.$t('Faucet unavailable (wrong network)');
                    canTap.value = false;
                }
                if (faucet.dispensesRemaining < 1) {
                    unavailableMsg.value = context.root.$t('Faucet is empty');
                    canTap.value = false;
                }
                if (!faucet.availableInRegion) {
                    unavailableMsg.value = context.root.$t('Faucet is not available from your location');
                    canTap.value = false;
                }

                return faucet;
            }).catch((error: Error) => {
                console.error(error); // eslint-disable-line no-console
                unavailableMsg.value = `${context.root.$t('Faucet unavailable')} (${error.message})`;
                canTap.value = false;
                return null;
            });

        async function tap() {
            loading.value = true;

            await faucetInfoPromise;
            if (!canTap.value) return false;

            return fetch(`${FAUCET_URL}/tapit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    address: props.address,
                }),
            }).then((res) => res.json() as Promise<FaucetTapResponse>).then((result) => {
                if (result.success) {
                    // Do nothing and wait until the transaction appears in the list and this component gets replaced.
                    return true;
                }

                loading.value = false;

                if (result.error === 'TRANSACTION_FAILED') {
                    // Reset button for user to try again
                    unavailableMsg.value = context.root.$t('Faucet error - please try again');
                } else {
                    errorMsg.value = result.msg; // Disables button and shows the error message.
                }

                return false;
            }).catch((error: Error) => {
                console.error(error); // eslint-disable-line no-console
                errorMsg.value = `${context.root.$t('Request failed')}: ${error.message}`;
                return false;
            });
        }

        return {
            canTap,
            unavailableMsg,
            errorMsg,
            loading,
            tap,
        };
    },
    components: {
        CircleSpinner,
        CrossIcon,
    },
});
</script>

<style lang="scss" scoped>
.testnet-faucet {
    justify-content: center;
    align-items: center;
    min-height: 7.5rem;
}

button {
    margin: 0;
}

.unavailable,
.error {
    font-weight: 600;

    svg {
        width: 2.5rem;
        height: 2.5rem;
        margin-right: 1rem;
        margin-bottom: -0.5rem;
    }
}

.unavailable {
    margin-bottom: 2rem;
}

</style>
