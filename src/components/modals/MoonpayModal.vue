<template>
    <Modal class="moonpay-modal">
        <!-- Iframe allow list from Moonpay docs -->
        <iframe :src="url" allow="accelerometer; autoplay; camera; gyroscope; payment" frameborder="0">
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
import { defineComponent } from '@vue/composition-api';
import { PageFooter } from '@nimiq/vue-components';
import Config from 'config';
import Modal from './Modal.vue';
import { ENV_MAIN } from '../../lib/Constants';
import { useSettingsStore } from '../../stores/Settings';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';

export default defineComponent({
    setup() {
        const domain = Config.environment === ENV_MAIN
            ? 'https://buy.moonpay.com?apiKey=xxx'
            : 'https://buy-staging.moonpay.com?apiKey=pk_test_N3px5sgYEnrWtGxAkXHNoVno3At9ZYO';

        const language = useSettingsStore().state.language; // eslint-disable-line prefer-destructuring
        const baseCurrencyCode = useFiatStore().state.currency;
        const defaultCurrencyCode = useAccountStore().state.activeCurrency;

        const walletAddresses = {
            nim: useAddressStore().state.activeAddress,
            btc: useBtcAddressStore().availableExternalAddresses.value[0],
        };

        const widgetUrl = [
            domain,
            'colorCode=%231F2348',
            `language=${language}`,
            `baseCurrencyCode=${baseCurrencyCode}`,
            `defaultCurrencyCode=${defaultCurrencyCode}`,
            `walletAddresses=${encodeURIComponent(JSON.stringify(walletAddresses))}`,
        ].join('&');

        const url = /* signUrl( */widgetUrl/* ) */;

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
