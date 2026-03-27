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
import { computed, defineComponent } from '@vue/composition-api';
import { Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
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

        const widgetUrl = computed(() => {
            const url = new URL(config.coinify.widgetUrl);
            url.searchParams.set('partnerId', config.coinify.partnerId);
            url.searchParams.set('partnerName', 'Nimiq');
            url.searchParams.set('targetPage', props.flow);
            url.searchParams.set('defaultCryptoCurrency', activeCurrency.value.toUpperCase());
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
            const addresses = [`NIM:${activeAddress.value!.replace(/\s/g, '')}`];
            const walletTypes = ['NIM:self_hosted'];
            if (config.enableBitcoin && hasBitcoinAddresses.value && availableExternalAddresses.value.length) {
                addresses.push(`BTC:${availableExternalAddresses.value[0]}`);
                walletTypes.push('BTC:self_hosted');
            }
            if (config.polygon.enabled && hasPolygonAddresses.value && stablecoin.value) {
                addresses.push(`${stablecoin.value.toUpperCase()}POLYGON:${polygonActiveAddress.value}`);
                walletTypes.push(`${stablecoin.value.toUpperCase()}POLYGON:self_hosted`);
            }
            url.searchParams.set('address', addresses.join(','));
            url.searchParams.set('walletType', walletTypes.join(','));
            return url.toString();
        });

        function close() {
            // Force navigation to home instead of using router.back()
            // to avoid issues with Simplex widget interfering with browser history
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
