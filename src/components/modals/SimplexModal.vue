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
        <form id="simplex-form" ref="simplex">
            <div id="checkout-element"></div>
        </form>
        <div v-if="mustReload" class="reload-notice flex-column">
            {{ $t('Refresh the page to continue.') }}
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onActivated } from '@vue/composition-api';
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
            updateCryptoCurrency: (currency: string) => void,
            on(event: string, handler: (...args: any[]) => any): void,
        };
        Simplex: {
            init: (options: { public_key: string}) => void, // eslint-disable-line camelcase
            subscribe: (
                event: 'onlineFlowFinished',
                handler: (event: {
                    payload: {
                        result: 'success' | 'failure',
                    },
                }) => void,
            ) => void,
            getSDKVersion: () => string,
            // load: (...) => ...
            // unload: (...) => ...
            // unsubscribe: (...) => ...
        };
        simplexAsyncFunction: () => void;
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

        async function loadScript(src: string, id: string): Promise<void> {
            return new Promise<void>((resolve) => {
                const $script = document.createElement('script');
                $script.type = 'text/javascript';
                $script.id = id;
                $script.addEventListener('load', () => resolve());
                $script.src = src;
                window.document.body.appendChild($script);
            });
        }

        async function loadScripts(): Promise<any> {
            // Check if script already exists
            if (document.querySelector('script#simplex-form-script')) {
                return Promise.resolve();
            }

            window.simplexAsyncFunction = () => {
                window.Simplex.init({
                    public_key: 'pk_test_0c3e2ecd-1546-4068-ae01-d49382e1266a',
                });

                window.Simplex.subscribe('onlineFlowFinished', event => {
                    context.root.$router.push('/');
                });
            };

            return Promise.all([
                loadScript('https://iframe.sandbox.test-simplexcc.com/form-sdk.js', 'simplex-form-script'),
                loadScript('https://cdn.test-simplexcc.com/sdk/v1/js/sdk.js', 'simplex-sdk-script'),
            ]);
        }

        function loadStyles() {
            if (document.querySelector('style#simplex-css')) return;

            const $style = document.createElement('style');
            $style.type = 'text/css';
            $style.id = 'simplex-css';
            $style.innerHTML = `
    .simplex-form {
        padding-right: 1rem;
    }

    .simplex-continue-button {
        background-color: lightblue !important;
    }
`;
            window.document.body.appendChild($style);
        }

        onMounted(async () => {
            await loadScripts();

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

        const mustReload = ref(false);

        onActivated(async () => {
            const $iframe = (context.refs['simplex'] as HTMLFormElement).querySelector('iframe');
            mustReload.value = window.simplex && (!!$iframe && !$iframe.src);
        });

        return {
            mustReload,
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

#simplex-form {
    padding: 1rem 0 1rem 1rem;
    flex-grow: 1;

    #checkout-element,
    /deep/ iframe {
        height: 100%;
    }
}

.reload-notice {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    justify-content: center;
    align-items: center;
    font-weight: 600;
    font-size: 2rem;
}
</style>
