<template>
    <div class="testnet-faucet flex-column">
        <div v-if="unavailableMsg" class="unavailable nq-orange"><CrossIcon/>{{ unavailableMsg }}</div>

        <!-- <transition name="fade"> -->
            <button v-if="!loading && !errorMsg"
                class="nq-button green"
                :disabled="!canTap"
                @click="tap" @mousedown.prevent
            >
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
import Config from 'config';
import { ENV_MAIN } from '@/lib/Constants';
import { useI18n } from '@/lib/useI18n';

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
    error?: 'VAPTCHA_UNAVAILABLE'
        | 'INVALID_CAPTCHA'
        | 'INVALID_ADDRESS'
        | 'GEOBLOCKED'
        | 'OUT_OF_FUNDS'
        | 'TRANSACTION_FAILED',
} | {
    success: false,
    msg: string,
    error: 'RATE_LIMIT',
    wait: number,
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
    setup(props) {
        const { $t } = useI18n();
        const canTap = ref(true); // Expect the faucet to be available
        const unavailableMsg: Ref<LocaleMessage> = ref('');
        const errorMsg: Ref<LocaleMessage> = ref('');
        const loading = ref(false);

        const faucetInfoPromise = fetch(`${Config.faucetEndpoint}/info`)
            .then((res) => res.json() as Promise<FaucetInfoResponse>)
            .then((faucet) => {
                // Only allow the faucet if either both the faucet and the Config of the wallet
                // are in mainnet or neither is.
                if ((Config.environment !== ENV_MAIN && faucet.network === 'main')
                    || (Config.environment === ENV_MAIN && faucet.network !== 'main')) {
                    unavailableMsg.value = $t('Faucet unavailable (wrong network)');
                    canTap.value = false;
                }
                if (faucet.dispensesRemaining < 1) {
                    unavailableMsg.value = $t('Faucet is empty');
                    canTap.value = false;
                }
                if (!faucet.availableInRegion) {
                    unavailableMsg.value = $t('Faucet is not available from your location');
                    canTap.value = false;
                }

                return faucet;
            }).catch((error: Error) => {
                console.error(error); // eslint-disable-line no-console
                unavailableMsg.value = `${$t('Faucet unavailable')} (${error.message})`;
                canTap.value = false;
                return null;
            });

        async function tap() {
            loading.value = true;

            await faucetInfoPromise;
            if (!canTap.value) return false;

            return fetch(`${Config.faucetEndpoint}/tapit`, {
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
                errorMsg.value = '';
                unavailableMsg.value = '';

                switch (result.error) {
                    case 'RATE_LIMIT':
                        errorMsg.value = $t(
                            'You can receive more free NIM in {waitTime} hours.',
                            { waitTime: Math.ceil(result.wait / 3600) },
                        );
                        break;
                    case 'GEOBLOCKED':
                        errorMsg.value = $t(
                            'This service is currently not available in your region.',
                        );
                        break;
                    case 'OUT_OF_FUNDS':
                        errorMsg.value = $t('There are currently no free NIM available.');
                        break;
                    case 'TRANSACTION_FAILED':
                        // Set unavailableMsg instead of errorMsg to keep button active for user to try again
                        unavailableMsg.value = $t('Faucet error - please try again.');
                        break;
                    default:
                        // 'INVALID_CAPTCHA', 'VAPTCHA_UNAVAILABLE', 'INVALID_ADDRESS' or unspecified errors should
                        // not occur via this frontend, therefore no need to translate them.
                        errorMsg.value = `${$t('Request failed')}: ${result.msg}`;
                }

                return false;
            }).catch((error: Error) => {
                console.error(error); // eslint-disable-line no-console
                errorMsg.value = `${$t('Request failed')}: ${error.message}`;
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
    padding: 0 5rem;
    font-weight: 600;
    text-align: center;

    svg {
        display: inline-block;
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
