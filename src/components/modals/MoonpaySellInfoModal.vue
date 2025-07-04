<template>
    <Modal class="disclaimer-modal">
        <PageBody class="flex-column">
            <header class="flex-column">
                <svg class="background" viewBox="0 0 421 166" fill="#F8F8F8" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-84.5 -95.25H506L497.5 166C264.868 125.233 144.154 124.767 -84.5 166V-95.25Z"/>
                </svg>

                <img src="@/assets/exchanges/moonpay-full.svg" alt="Moonpay" />
            </header>

            <main class="flex-column">
                <h1 class="nq-h1" v-if="stablecoin">
                    {{ $t('Sell BTC and {ticker}', { ticker: stablecoin.toUpperCase() }) }}
                </h1>
                <h1 class="nq-h1" v-else>{{ $t('Sell BTC') }}</h1>

                <p class="subline">{{ $t('MoonPay is a third-party service requiring registration and KYC.') }}</p>

                <div class="crypto-logos flex-row">
                    <BitcoinIcon title="BTC" />
                    <UsdcIcon v-if="stablecoin === CryptoCurrency.USDC" :title="stablecoin.toUpperCase()" />
                    <UsdtIcon v-if="stablecoin === CryptoCurrency.USDT" :title="stablecoin.toUpperCase()" />
                </div>

                <p class="fees flex-row">
                    {{ $t('{percentage} fees', { percentage: '1%'}) }}
                    <svg viewBox="0 0 3 3" xmlns="http://www.w3.org/2000/svg" class="dot">
                        <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor"/>
                    </svg>
                    <i18n path="min {amount}" tag="span">
                        <FiatAmount slot="amount"
                            :amount="3.99"
                            :currency="[FiatCurrency.EUR, FiatCurrency.GBP].includes(currency)
                                ? currency
                                : FiatCurrency.USD"
                        />
                    </i18n>
                </p>
                <small>{{ $t('+ network fees') }}</small>
            </main>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="$router.push({ name: 'moonpay', params: { flow: 'sell' } })">
                {{ $t('Continue with Moonpay') }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { PageBody, PageFooter, FiatAmount } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import UsdtIcon from '../icons/UsdtIcon.vue';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountSettingsStore } from '../../stores/AccountSettings';
import { CryptoCurrency, FiatCurrency } from '../../lib/Constants';

export default defineComponent({
    setup() {
        const { currency } = useFiatStore();
        const { stablecoin } = useAccountSettingsStore();

        return {
            currency,
            FiatCurrency,
            stablecoin,
            CryptoCurrency,
        };
    },
    components: {
        Modal,
        PageBody,
        PageFooter,
        BitcoinIcon,
        UsdcIcon,
        UsdtIcon,
        FiatAmount,
    },
});
</script>

<style lang="scss" scoped>
    .page-body {
        padding-top: 0;
        padding-left: 0;
        padding-right: 0;
    }

    header {
        height: 21rem;
        justify-content: center;
        align-items: center;
        position: relative;

        svg.background {
            position: absolute;
            inset: 0;
            overflow: hidden;
            border-top-left-radius: 1.25rem;
            border-top-right-radius: 1.25rem;
        }

        img {
            position: relative;
            margin-top: -4rem;
            width: 23.5rem;
        }
    }

    main {
        justify-content: center;
        align-items: center;
        flex-grow: 1;
    }

    .nq-h1 {
        margin: 0;
        line-height: 1.2;
    }

    .subline {
        max-width: 34rem;
        font-size: var(--body-size);
        line-height: 1.4;
        text-align: center;
        margin-top: 1rem;
        margin-bottom: 0;
    }

    .crypto-logos {
        border: 1px solid var(--text-10);
        padding: 0.5rem;
        border-radius: 9rem;
        gap: 1rem;
        margin: 3rem 0;

        svg {
            width: 3.25rem;
            height: 3.25rem;
        }

        .bitcoin {
            color: var(--bitcoin-orange);
        }

        .usdc {
            color: var(--usdc-blue);
        }

        .usdt {
            color: var(--usdt-green);
        }
    }

    .fees {
        margin: 0;
        align-items: center;
        gap: 0.75rem;
        line-height: 1;
        font-size: var(--h2-size);
        font-weight: 600;

        .dot {
            width: 0.5rem;
            height: 0.5rem;
            opacity: 0.5;
        }
    }

    small {
        font-size: var(--small-size);
        font-weight: 600;
        opacity: 0.7;
        line-height: 1;
        margin-top: 0.75rem;
    }
</style>
