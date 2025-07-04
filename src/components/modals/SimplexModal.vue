<template>
    <Modal class="moonpay-modal">
        <PageHeader>
            {{ $t('Buy with Simplex') }}
        </PageHeader>
        <Tooltip preferredPosition="bottom right">
            <InfoCircleSmallIcon slot="trigger"/>
            <i18n path="This service is operated by {link}" tag="span">
                <a slot="link" href="https://simplex.com" target="_blank" rel="noopener">simplex.com</a>
            </i18n>
        </Tooltip>
        <!-- Using v-show here is on purpose: the Simplex widget breaks when removing this element with using v-if -->
        <PageBody v-show="showAddressCopyUi" class="copy-address">
            <template v-if="$config.disableNetworkInteraction && cryptoCurrencyCode === CryptoCurrency.NIM">
                <p class="nq-text nq-orange">
                    {{ $t('The Simplex integration is currently disabled while the network is experiencing an '
                    + 'outage.') }}
                </p>
            </template>
            <template v-else>
                <p class="nq-text nq-light-blue">
                    {{ $t('Copy and paste your address into\nthe Simplex interface below.') }}
                </p>
                <div class="identicon-container">
                    <ResizingCopyable :text="currentlyShownAddress">
                        <div
                            class="address flex-row"
                            :class="{'show-identicon': cryptoCurrencyCode === CryptoCurrency.NIM}"
                        >{{ currentlyShownAddress }}</div>
                    </ResizingCopyable>
                    <Identicon v-if="cryptoCurrencyCode === CryptoCurrency.NIM" :address="currentlyShownAddress"/>
                </div>
            </template>
        </PageBody>
        <div class="separator"></div>
        <form id="simplex-form" ref="simplex$">
            <div id="checkout-element"></div>
        </form>
        <div v-if="mustReload" class="reload-notice flex-column">
            {{ $t('Refresh the page to continue.') }}
        </div>
        <div v-if="showAddressCopyUi
            && !($config.disableNetworkInteraction && cryptoCurrencyCode === CryptoCurrency.NIM)"
            class="copy-over-arrow">
            <svg width="162" height="285" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M55.4 24c64 35.8 68.3 151.1 13.3 191.8m12.6 4.2l-15.7-2 1.8-15.7"
                    stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="copy-over">{{ $t('Copy\nover') }}</div>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onActivated, onUnmounted, computed } from 'vue';
import { Tooltip, InfoCircleSmallIcon, PageHeader, PageBody, Identicon } from '@nimiq/vue-components';
import { useRouter } from '@/router';
import Modal from './Modal.vue';
import ResizingCopyable from '../ResizingCopyable.vue';
import { useSettingsStore } from '../../stores/Settings';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { useAccountSettingsStore } from '../../stores/AccountSettings';
import { useConfig } from '../../composables/useConfig';
import { CryptoCurrency, ENV_DEV } from '../../lib/Constants';

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
        const cryptoCurrencyCode = ref(useAccountStore().state.activeCurrency);
        const { stablecoin } = useAccountSettingsStore();

        // Having a BTC address must be optional, so that the widget also works
        // for legacy or non-bitcoin-activated accounts.
        const btcAddress: string | undefined = useBtcAddressStore().availableExternalAddresses.value[0];

        // Having a USDC address must be optional, so that the widget also works
        // for legacy or non-polygon-activated accounts.
        const usdcAddress = stablecoin.value === CryptoCurrency.USDC
            ? usePolygonAddressStore().activeAddress.value
            : undefined;

        // Having a USDT address must be optional, so that the widget also works
        // for legacy or non-polygon-activated accounts.
        const usdtAddress = stablecoin.value === CryptoCurrency.USDT
            ? usePolygonAddressStore().activeAddress.value
            : undefined;

        const walletAddresses: {[c: string]: string | undefined} = {
            // Remove spaces in NIM address, as spaces are invalid URI components
            nim: useAddressStore().state.activeAddress || undefined,
            ...(btcAddress ? { btc: btcAddress } : {}),
            ...(usdcAddress ? { usdc: usdcAddress } : {}),
            ...(usdtAddress ? { usdt: usdtAddress } : {}),
        };

        const { config } = useConfig();

        async function loadScript(src: string, id: string): Promise<void> {
            return new Promise<void>((resolve) => {
                const script$ = document.createElement('script');
                script$.type = 'text/javascript';
                script$.id = id;
                script$.addEventListener('load', () => resolve());
                script$.src = src;
                window.document.body.appendChild(script$);
            });
        }

        const router = useRouter();

        async function loadScripts(): Promise<any> {
            // Check if script already exists
            if (document.querySelector('script#simplex-form-script')) {
                return Promise.resolve();
            }

            window.simplexAsyncFunction = () => {
                window.Simplex.init({ public_key: config.simplex.apiKey });

                window.Simplex.subscribe('onlineFlowFinished', () => {
                    // Close modal
                    router.push('/');
                });
            };

            return Promise.all([
                loadScript(config.simplex.formScriptUrl, 'simplex-form-script'),
                loadScript(config.simplex.sdkScriptUrl, 'simplex-sdk-script'),
                ...(config.simplex.splxScriptUrl
                    ? [loadScript(config.simplex.splxScriptUrl, 'simplex-splx-script')]
                    : []
                ),
            ]);
        }

        function loadStyles() {
            if (document.querySelector('style#simplex-css')) return;

            const style$ = document.createElement('style');
            style$.type = 'text/css';
            style$.id = 'simplex-css';
            style$.innerHTML = `
    .simplex-form {
        padding: 0 2rem 1rem 1.5rem;
        font-family: Mulish, Muli, -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .form-control,
    .form-control:focus,
    .input-group .form-control:focus {
        border: none;
        box-shadow: inset 0 0 0 1.5px nimiq-blue(0.5) !important;
        font-weight: bold;
        height: 2.875rem;
        color: black;
        font-variant-numeric: tabular-nums;
        font-size: 1rem;
    }

    .form-control::placeholder {
        color: rgba(0, 0, 0, 0.3);
    }

    .input-group .form-control {
        margin-right: -0.25rem;
    }

    /* to overlay the extended .form-control in default state*/
    .input-group div {
        position: relative;
    }

    /* to overlay the extended .form-control during focus */
    .input-group .form-control:focus + div {
        z-index: 4;
    }

    .dropdown-btn {
        background: #1F2348;
        border: 0.125rem solid #1F2348;
        color: white;
        font-weight: bold;
        font-size: 1rem;
        line-height: 1.65;
        outline: none;
    }

    .address-disclaimer {
        opacity: 0.5;
        margin-top: 0.5rem;
    }

    .address-disclaimer + div {
        display: none;
    }

    .simplex-continue-button {
        background: #1F2348 !important;
        border: 0.125rem solid #1F2348 !important;
        color: white !important;
        font-weight: bold;
        font-size: 1rem;
        letter-spacing: 0.09em;
        padding: 0.5rem 1.5rem !important;
        margin-bottom: 0.5rem;
    }

    .simplex-continue-button:hover {
        background: #151833 !important;
    }

    .powered-logo {
        flex-grow: 1;
        align-items: flex-end;
    }
`;
            window.document.body.appendChild(style$);
        }

        const showAddressCopyUi = ref(true);

        let observer: MutationObserver | undefined;

        onMounted(async () => {
            await loadScripts();

            if (config.environment === ENV_DEV) {
                loadStyles();
            }

            try {
                // Try setting the language in the URL (Simplex SDK takes it from there)
                await router.replace({ name: 'simplex', query: { lang: language } });
            } catch (error) {
                // ignore
            }

            let cryptoCurrency = cryptoCurrencyCode.value.toUpperCase();
            if (cryptoCurrency === 'USDC') cryptoCurrency = 'USDC-MATIC';
            if (cryptoCurrency === 'USDT') cryptoCurrency = 'USDT-MATIC';

            await window.simplex.createForm({
                showFiatFirst: true,
                fiat: fiatCurrencyCode.toUpperCase(),
                crypto: cryptoCurrency,
            });

            // Observe for when the simplex iframe is removed, which is when the the checkout flow
            // is loaded. We use this to remove the address copying UI and copy-over-arrow.
            observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' && mutation.removedNodes[0] instanceof HTMLIFrameElement) {
                        showAddressCopyUi.value = false;
                    }
                }
            });
            observer.observe((context.refs.simplex$ as HTMLFormElement), { childList: true, subtree: true });

            window.simplex.on('crypto-changed', (crypto: string) => {
                if (crypto === 'USDC-MATIC') crypto = 'USDC';
                if (crypto === 'USDT-MATIC') crypto = 'USDT';
                cryptoCurrencyCode.value = crypto.toLowerCase() as CryptoCurrency;
            });
        });

        const mustReload = ref(false);

        onActivated(async () => {
            // If we find an iframe in the simplex-form that has no src attribute, it means the user continued
            // to the checkout flow. This state is not recoverable once the modal has been closed.
            // The only workaround is to reload the page and start with a fresh Javascript context.
            const iframe$ = (context.refs.simplex$ as HTMLFormElement).querySelector('iframe');
            mustReload.value = window.simplex && (!!iframe$ && !iframe$.src);
        });

        onUnmounted(() => {
            if (observer) observer.disconnect();
        });

        const currentlyShownAddress = computed(() => walletAddresses[cryptoCurrencyCode.value]);

        return {
            showAddressCopyUi,
            currentlyShownAddress,
            mustReload,
            cryptoCurrencyCode,
            CryptoCurrency,
        };
    },
    components: {
        PageHeader,
        PageBody,
        Modal,
        Tooltip,
        InfoCircleSmallIcon,
        ResizingCopyable,
        Identicon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

.modal ::v-deep .small-page {
    height: 83.25rem; /* Height to fit Moonpay confirmation page without iframe scrollbar, with two-line disclaimer */
}

.page-header {
    padding-bottom: 2rem;
}

.tooltip {
    position: absolute;
    left: 3rem;
    top: 3rem;

        ::v-deep {
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
}

.copy-address {
    overflow: hidden;
    flex-grow: 0;
    padding: 0 2rem 3rem;

    .nq-text {
        font-weight: 600;
        text-align: center;
        margin-bottom: 1.75rem;
        white-space: pre-line;
    }

    .address {
        padding: 0 var(--padding);
        height: 100%;
        justify-content: center;
        align-items: center;

        &.show-identicon {
            padding-left: 6.5rem;
        }
    }

    .identicon-container {
        position: relative;
    }

    .identicon {
        width: 4rem;
        position: absolute;
        left: 1rem;
        bottom: 1rem;
        margin: -0.25rem 0;
    }
}

.separator {
    height: 2px;
    margin: -2px 2rem 2px;
    box-shadow: 0 1.5px 0 0 var(--text-14);
}

#simplex-form {
    padding: calc(3rem - 3px) 0 1rem 1rem;
    flex-grow: 1;

    #checkout-element,
    ::v-deep iframe {
        height: 100%;
    }
}

.reload-notice {
    position: absolute;
    top: 9rem;
    right: 0;
    bottom: 0;
    left: 0;
    justify-content: center;
    align-items: center;
    font-weight: 600;
    font-size: 2rem;
}

.copy-over-arrow {
    position: absolute;
    left: calc(100% - 5rem);
    top: 17.5rem;
    z-index: -1;

    .copy-over {
        position: absolute;
        color: white;
        font-weight: bold;
        font-size: 2.5rem;
        top: 13rem;
        left: 16rem;
        white-space: pre-line;
    }
}
</style>
