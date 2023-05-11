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
        <div class="widget-container flex-column flex-grow" id="moonpay-widget-container">
            <span v-if="!widgetReady" class="placeholder">{{ $t('Loading Moonpay...') }}</span>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { useSettingsStore } from '../../stores/Settings';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { useConfig } from '../../composables/useConfig';
import { loadScript } from '../../lib/ScriptLoader';
import { CryptoCurrency, ENV_MAIN } from '../../lib/Constants';

declare global {
    interface Window {
        MoonPayWebSdk: any;
    }
}

export default defineComponent({
    setup() {
        const { language } = useSettingsStore().state;
        const baseCurrencyCode = useFiatStore().state.currency;
        let defaultCurrencyCode: CryptoCurrency | 'usdc_polygon' = useAccountStore().state.activeCurrency;
        if (defaultCurrencyCode === 'usdc') defaultCurrencyCode = 'usdc_polygon';

        // Having a BTC address must be optional, so that the widget also works
        // for legacy or non-bitcoin-activated accounts.
        const btcAddress = useBtcAddressStore().availableExternalAddresses.value[0] as string | undefined;

        // Having a USDC address must be optional, so that the widget also works
        // for legacy or non-polygon-activated accounts.
        const usdcAddress = useUsdcAddressStore().activeAddress.value;

        const walletAddresses = {
            // Remove spaces in NIM address, as spaces are invalid URI components
            nim: useAddressStore().state.activeAddress?.replace(/\s/g, ''),
            ...(btcAddress ? { btc: btcAddress } : {}),
            ...(usdcAddress ? { usdc_polygon: usdcAddress } : {}),
        };

        const { config } = useConfig();

        const widgetReady = ref(false);

        onMounted(async () => {
            await loadScript('MoonPayWebSdk', 'https://static.moonpay.com/web-sdk/v1/moonpay-web-sdk.min.js');

            const widget = window.MoonPayWebSdk.init({
                flow: 'buy', // TODO: Depend on prop
                environment: config.environment === ENV_MAIN ? 'production' : 'sandbox',
                variant: 'embedded',
                containerNodeSelector: '#moonpay-widget-container',
                params: {
                    apiKey: config.moonpay.clientApiKey,
                    colorCode: '#0582CA',
                    language,
                    baseCurrencyCode,
                    defaultCurrencyCode,
                    walletAddresses: JSON.stringify(walletAddresses),
                },
            });

            const widgetUrl = widget.generateUrlForSigning();

            const signature = await fetch(config.moonpay.signatureEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: widgetUrl,
                }),
            }).then((response) => response.text());

            widget.updateSignature(signature);

            widget.show();
            widgetReady.value = true;
        });

        return {
            widgetReady,
        };
    },
    components: {
        Modal,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .small-page {
    height: 83.25rem; /* Height to fit Moonpay confirmation page without iframe scrollbar, with two-line disclaimer */
}

header {
    justify-content: space-between;
    align-items: center;
    padding: 2rem 3rem;

    .tooltip ::v-deep {
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
        width: 18rem;
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

.widget-container {
    justify-content: center;
    align-items: center;

    .placeholder {
        font-weight: bold;
        font-size: var(--small-size);
        opacity: 0.5;
    }

    ::v-deep iframe {
        border: none;
        border-bottom-left-radius: 1.25rem;
        border-bottom-right-radius: 1.25rem;
    }
}
</style>
