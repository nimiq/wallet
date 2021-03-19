<template>
    <Modal class="moonpay-modal">
        <header class="flex-row">
            <Tooltip preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <i18n path="This service is operated by {link}" tag="span">
                    <a slot="link" href="https://moonpay.com" target="_blank" rel="noopener">moonpay.com</a>
                </i18n>
            </Tooltip>
            <img src="../../assets/exchanges/moonpay-full.svg" alt="Moonpay Logo">
            <div class="flex-spacer"></div>
        </header>
        <div class="separator"></div>
        <div v-if="!url" class="placeholder flex-column flex-grow">{{ $t('Loading Moonpay...') }}</div>
        <!-- Iframe allow list from Moonpay docs -->
        <iframe v-else :src="url" allow="accelerometer; autoplay; camera; gyroscope; payment" frameborder="0">
            <p>Your browser does not support iframes.</p>
        </iframe>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon, PageFooter } from '@nimiq/vue-components';
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
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    height: 83.25rem; /* Height to fit Moonpay confirmation page without iframe scrollbar, with two-line disclaimer */
}

header {
    justify-content: space-between;
    align-items: center;
    padding: 2rem 3rem;

    .tooltip /deep/ {
        .trigger {
            color: var(--text-30);
        }

        .tooltip-box {
            font-size: var(--small-size);
            width: 23.5rem;

            a {
                color: inherit;
            }
        }
    }

    img {
        width: 114px;
    }

    .flex-spacer {
        width: 2.25rem;
    }
}

.separator {
    height: 2px;
    margin: -2px 2rem 2px;
    box-shadow: 0 1.5px 0 0 var(--text-14);
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
    border-bottom-left-radius: 1.25rem;
    border-bottom-right-radius: 1.25rem;
}
</style>
