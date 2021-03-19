<template>
    <Modal class="moonpay-modal">
        <header class="flex-row">
            <Tooltip preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <i18n path="This service is operated by {link}" tag="span">
                    <a slot="link" href="https://simplex.com" target="_blank" rel="noopener">simplex.com</a>
                </i18n>
            </Tooltip>
            <img src="../../assets/exchanges/simplex-full.png" alt="Simplex Logo">
            <div class="flex-spacer"></div>
        </header>
        <div class="separator"></div>
        <div id="simplex-form"></div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon, PageFooter } from '@nimiq/vue-components';
import Config from 'config';
import Modal from './Modal.vue';
import { useSettingsStore } from '../../stores/Settings';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { ENV_MAIN } from '../../lib/Constants';

declare global {
    interface Window {
        simplex: {
            createForm(options?: Partial<{
                crypto: string,
                fiat: string,
                showFiatFirst: boolean,
                useBitcoinCore: boolean,
                paymentMethods: string[],
                hosted: boolean,
            }>): Promise<{
                supportedCryptoCurrencies: string[],
            }>,
            on(event: string, handler: (...args: any[]) => any): void,
        };
    }
}

export default defineComponent({
    setup(props, context) {
        const language = useSettingsStore().state.language; // eslint-disable-line prefer-destructuring
        const fiatCurrencyCode = useFiatStore().state.currency;
        const cryptoCurrencyCode = useAccountStore().state.activeCurrency;

        // Having a BTC address must be optional, so that the widget also works
        // for legacy or non-bitcoin-activated accounts.
        const btcAddress = useBtcAddressStore().availableExternalAddresses.value[0];

        const walletAddresses = {
            // Remove spaces in NIM address, as spaces are invalid URI components
            nim: useAddressStore().state.activeAddress?.replace(/\s/g, ''),
            ...(btcAddress ? { btc: btcAddress } : {}),
        };

        async function loadScript(): Promise<void> {
            // Check if script already exists
            if (document.querySelector('script#simplex-form-script')) {
                return Promise.resolve();
            }

            return new Promise<void>((resolve) => {
                const $script = document.createElement('script');
                $script.type = 'text/javascript';
                $script.id = 'simplex-form-script';
                $script.addEventListener('load', () => resolve());
                $script.src = 'https://iframe.sandbox.test-simplexcc.com/form.js';
                window.document.body.appendChild($script);
            });
        }

        function loadStyles() {
            if (document.querySelector('style#simplex-css')) return;

            const $style = document.createElement('style');
            $style.type = 'text/css';
            $style.id = 'simplex-css';
            $style.innerHTML = `
    .simplex-continue-button {
        background-color: green !important;
    }
`;
            window.document.body.appendChild($style);
        }

        onMounted(async () => {
            await loadScript();

            if (Config.environment !== ENV_MAIN) {
                loadStyles();
            }

            // Wait for DOM to update and include #simplex-form
            await context.root.$nextTick();

            const data = await window.simplex.createForm({
                showFiatFirst: true,
                fiat: fiatCurrencyCode.toUpperCase(),
                crypto: cryptoCurrencyCode.toUpperCase(),
            });
            console.log(data); // eslint-disable-line no-console

            window.simplex.on('crypto-changed', (crypto) => console.log(crypto)); // eslint-disable-line no-console
        });

        return {};
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

#simplex-form {
    padding: 2rem;
    flex-grow: 1;

    /deep/ iframe {
        height: 100%;
    }
}
</style>
