<template>
    <Modal class="coinify-modal" emitClose @close="close">
        <header class="flex-row">
            <Tooltip preferredPosition="bottom right">
                <InfoCircleSmallIcon slot="trigger"/>
                <i18n path="This service is operated by {link}" tag="span">
                    <a slot="link" href="https://coinify.com" target="_blank" rel="noopener">coinify.com</a>
                </i18n>
            </Tooltip>
            <img src="../../assets/exchanges/coinify-full.png" alt="Coinify Logo">
            <div class="flex-spacer"></div>
        </header>
        <div class="separator"></div>
        <iframe
            :src="widgetUrl"
            title="Coinify trade widget"
            allow="camera;fullscreen;accelerometer;gyroscope;magnetometer;payment"
            allowfullscreen
            class="widget-iframe flex-grow"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { CryptoCurrency } from '@nimiq/utils';
import router from '@/router';
import { useFiatStore } from '@/stores/Fiat';
import { useAccountStore } from '@/stores/Account';
import { useAccountSettingsStore } from '@/stores/AccountSettings';
import { useAddressStore } from '@/stores/Address';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { usePolygonAddressStore } from '@/stores/PolygonAddress';
import Modal from './Modal.vue';
import { useConfig } from '../../composables/useConfig';

export default defineComponent({
    name: 'CoinifyModal',
    props: {
        flow: {
            type: String as () => 'buy' | 'sell',
            default: 'buy' as const,
            // validator: val => ['buy', 'sell'].includes(val), // Adding this breaks type-inference for props
        },
    },
    setup(props) {
        const { config } = useConfig();
        const { currency } = useFiatStore();
        const { activeCurrency, hasBitcoinAddresses, hasPolygonAddresses } = useAccountStore();
        const { stablecoin } = useAccountSettingsStore();
        const { activeAddress } = useAddressStore();
        const { availableExternalAddresses } = useBtcAddressStore();
        const { activeAddress: polygonActiveAddress } = usePolygonAddressStore();

        // Construct widget iframe URL
        const widgetAddresses = new Map<string, string>();
        const url = new URL(config.coinify.widgetUrl);
        url.searchParams.set('partnerId', config.coinify.partnerId);
        url.searchParams.set('partnerName', 'Nimiq');
        url.searchParams.set('targetPage', props.flow);
        url.searchParams.set(
            'defaultCryptoCurrency',
            activeCurrency.value === CryptoCurrency.USDC
                ? 'USDCPOLYGON'
                : activeCurrency.value === CryptoCurrency.USDT
                    ? 'USDTPOLYGON'
                    : activeCurrency.value.toUpperCase(),
        );
        url.searchParams.set('defaultFiatCurrency', currency.value.toUpperCase());

        // Determine which cryptocurrencies to offer based on config and available addresses.
        // NIM is always offered, BTC and Polygon options are conditional.
        const cryptoCurrencies = ['NIM'];
        if (config.enableBitcoin && hasBitcoinAddresses.value) cryptoCurrencies.push('BTC');
        if (config.polygon.enabled && hasPolygonAddresses.value && stablecoin.value) {
            // Coinify does not (yet) support USDT on Polygon, but passing it in does no harm, it's simply ignored.
            cryptoCurrencies.push(`${stablecoin.value.toUpperCase()}POLYGON`);
        }
        url.searchParams.set('cryptoCurrencies', cryptoCurrencies.join(','));

        // Pass the relevant addresses for the selected cryptocurrencies, so the user doesn't have to enter
        // them manually in the widget.
        widgetAddresses.set('NIM', activeAddress.value!.replace(/\s/g, ''));
        if (config.enableBitcoin && hasBitcoinAddresses.value && availableExternalAddresses.value.length) {
            widgetAddresses.set('BTC', availableExternalAddresses.value[0]);
        }
        if (config.polygon.enabled && hasPolygonAddresses.value && stablecoin.value) {
            widgetAddresses.set(`${stablecoin.value.toUpperCase()}POLYGON`, polygonActiveAddress.value!);
        }

        const addresses = [...widgetAddresses.entries()].map(([crypto, address]) => `${crypto}:${address}`);
        const walletTypes = [...widgetAddresses.keys()].map((crypto) => `${crypto}:self_hosted`);
        url.searchParams.set('address', addresses.join(','));
        url.searchParams.set('walletType', walletTypes.join(','));
        const widgetUrl = url.toString();

        function onWidgetMessage(event: MessageEvent) {
            if (event.origin !== new URL(config.coinify.widgetUrl).origin) return;

            const msg = event.data;

            // We are only interested in sell confirmation events, where the user must make a transaction to Coinify
            if (msg.event === 'trade.trade-created' && msg.context.transferIn.medium === 'blockchain') {
                const payload = msg as {
                    type: 'event',
                    event: 'trade.trade-created',
                    context: {
                        createTime: string, // "2021-01-21T15:12:20.300Z"
                        id: number, // 123456
                        inAmount: number, // In full coins, e.g. 53.25
                        inCurrency: string, // e.g. "EUR" or "NIM"
                        isPriceQuoteApproximate: boolean,
                        outAmountExpected: number, // In full coins, e.g. 0.00187817
                        outCurrency: string, // e.g. "BTC"
                        quoteExpireTime: string, // "2021-01-21T15:27:20.300Z"
                        state: string, // e.g. "awaiting_transfer_in",
                        traderEmail: string,
                        traderId: number,
                        transferIn: {
                            id: number, // 123456
                            sendAmount: number, // In full coins, e.g. 116023.12353
                            receiveAmount: number, // In full coins, e.g. 116000
                            currency: 'NIM' | 'BTC' | 'USDCPOLYGON' | 'USDTPOLYGON',
                            medium: 'blockchain',
                            details?: {
                                account: string, // The crypto address the user should send the coins to
                                memo?: string | null,
                                paymentUri: string,
                            },
                        },
                        transferOut: {
                            id: number, // 123456
                            sendAmount: number, // In full coins, e.g. 55.05
                            receiveAmount: number, // In full coins, e.g. 50
                            currency: string, // e.g. "USD"
                            medium: 'bank',
                            details: any, // Not relevant for our use case, can be ignored
                        },
                        updateTime: string, // "2021-01-21T15:12:20.300Z"
                    },
                };

                // For NIM and BTC we can use the payment URI as-is
                if (payload.context.inCurrency === 'NIM' || payload.context.inCurrency === 'BTC') {
                    router.push(`/${payload.context.transferIn.details!.paymentUri}`);
                }
                // For USDC/T, we have to handle some things
                if (payload.context.inCurrency === 'USDCPOLYGON') {
                    // Ensure the user is in USDC mode
                    useAccountSettingsStore().setStablecoin(CryptoCurrency.USDC);
                    const paymentUri = payload.context.transferIn.details!.paymentUri
                        .replace('usdc-polygon:', 'polygon:');
                    router.push(`/${paymentUri}`);
                }
                if (payload.context.inCurrency === 'USDTPOLYGON') {
                    // Ensure the user is in USDT mode
                    useAccountSettingsStore().setStablecoin(CryptoCurrency.USDT);
                    const paymentUri = payload.context.transferIn.details!.paymentUri
                        .replace('usdt-polygon:', 'polygon:');
                    router.push(`/${paymentUri}`);
                }
            }
        }

        onMounted(() => {
            window.addEventListener('message', onWidgetMessage, false);
        });

        onUnmounted(() => {
            window.removeEventListener('message', onWidgetMessage, false);
        });

        function close() {
            // Force navigation to home instead of using router.back()
            // to avoid issues with Coinify widget interfering with browser history
            router.push('/');
        }

        return {
            widgetUrl,
            close,
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
    height: 106rem;
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

    .nq-label {
        font-size: 2rem;
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

.widget-iframe {
    border: none;
    width: 100%;
    border-bottom-left-radius: 1.25rem;
    border-bottom-right-radius: 1.25rem;
}
</style>
