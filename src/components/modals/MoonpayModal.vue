<template>
    <Modal class="moonpay-modal">
        <!-- Iframe allow list from Moonpay docs -->
        <div v-if="!url" class="placeholder flex-column flex-grow">{{ $t('Loading Moonpay...') }}</div>
        <iframe v-else :src="url" allow="accelerometer; autoplay; camera; gyroscope; payment" frameborder="0">
            <p>Your browser does not support iframes.</p>
        </iframe>
        <PageFooter>
            <i18n path="This service is operated by {link}" tag="span">
                <a slot="link" href="https://moonpay.com" target="_blank">moonpay.com</a>
            </i18n>
            <button class="nq-button-s" @click="$router.back()" @mousedown.prevent>
                {{ $t('Cancel') }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageFooter } from '@nimiq/vue-components';
import Config from 'config';
import Modal from './Modal.vue';
import { useSettingsStore } from '../../stores/Settings';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';

export default defineComponent({
    setup() {
        const language = useSettingsStore().state.language; // eslint-disable-line prefer-destructuring
        const baseCurrencyCode = useFiatStore().state.currency;
        const defaultCurrencyCode = useAccountStore().state.activeCurrency;

        // Having a BTC address must be optional, so that the widget also works
        // for legacy or non-bitcoin-activated accounts.
        const btcAddress = useBtcAddressStore().availableExternalAddresses.value[0];

        const walletAddresses = {
            // Remove spaces in NIM address, as spaces are invalid URI components
            nim: useAddressStore().state.activeAddress?.replace(/\s/g, ''),
            ...(btcAddress ? { btc: btcAddress } : {}),
        };

        const widgetUrl = [
            Config.moonpay.widgetUrl,
            'colorCode=%231F2348',
            `language=${language}`,
            `baseCurrencyCode=${baseCurrencyCode}`,
            `defaultCurrencyCode=${defaultCurrencyCode}`,
            `walletAddresses=${encodeURIComponent(JSON.stringify(walletAddresses))}`,
        ].join('&');

        const url = ref<string>(null);

        fetch(Config.moonpay.signatureEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: widgetUrl,
            }),
        }).then((response) => response.text()).then((signature) => {
            url.value = `${widgetUrl}&signature=${encodeURIComponent(signature)}`;
        });

        return {
            url,
        };
    },
    components: {
        PageFooter,
        Modal,
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    height: 83.25rem; /* Height to fit Moonpay confirmation page without iframe scrollbar, with two-line disclaimer */
}

.modal /deep/ .close-button {
    display: none;
}

.placeholder {
    justify-content: center;
    align-items: center;
    font-weight: bold;
    font-size: var(--small-size);
    opacity: 0.5;
}

iframe {
    flex-grow: 1;
    align-self: stretch;
    border-top-left-radius: 1.25rem;
    border-top-right-radius: 1.25rem;
}

.page-footer {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 2rem 2rem;

    @media (max-width: 700px) { // Full mobile breakpoint
        padding-bottom: 1.5rem;
    }

    span {
        font-size: var(--small-size);
        font-weight: 600;
        opacity: 0.8;

        a {
            color: inherit;
        }
    }

    button {
        margin-left: 1.5rem;
    }
}
</style>
