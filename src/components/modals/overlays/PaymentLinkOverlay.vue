<template>
    <div class="payment-link-overlay flex-column" @click="amountMenuOpened = false">
        <PageHeader class="link-overlay">
            {{ $t('Share your Request Link') }}
            <div slot="more">
                {{ $t('Share the link or QR code with the sender.\nOptionally include an amount. ') }}
            </div>
        </PageHeader>
        <PageBody class="flex-column link-overlay">
            <div class="inputs">
                <div class="separator"></div>

                <AmountInput v-if="activeCurrency === 'nim' || activeCurrency === 'btc'"
                    v-model="amount" :decimals="currency === 'btc' ? btcUnit.decimals : undefined"
                    :maxFontSize="5" ref="amountInputRef"
                >
                    <AmountMenu slot="suffix" class="ticker"
                        :open="amountMenuOpened"
                        :currency="currency"
                        :activeCurrency="activeCurrency === 'nim' ? activeCurrency : btcUnit.ticker.toLowerCase()"
                        :fiatCurrency="fiatCurrency"
                        :otherFiatCurrencies="otherFiatCurrencies"
                        :feeOption="false" :sendAllOption="false"
                        @currency="(currency) => activeCurrency = currency"
                        @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                </AmountInput>
                <AmountInput v-else v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals" :maxFontSize="5" >
                    <span slot="prefix" class="tilde">~</span>
                    <AmountMenu slot="suffix" class="ticker"
                        :open="amountMenuOpened"
                        :currency="currency"
                        :activeCurrency="activeCurrency"
                        :fiatCurrency="fiatCurrency"
                        :otherFiatCurrencies="otherFiatCurrencies"
                        :feeOption="false" :sendAllOption="false"
                        @currency="(currency) => activeCurrency = currency"
                        @click.native.stop="amountMenuOpened = !amountMenuOpened"/>
                </AmountInput>

                <div class="secondary-amount">
                    <span v-if="activeCurrency === 'nim' || activeCurrency === 'btc'" key="fiat-amount">
                        {{ amount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="amount" :currency="activeCurrency"/>
                    </span>
                    <span v-else-if="currency === 'nim'" key="nim-amount">
                        {{ amount / 1e5 }} NIM
                    </span>
                    <span v-else key="btc-amount">
                        {{ amount / btcUnit.unitToCoins }} {{ btcUnit.ticker }}
                    </span>
                </div>

                <div class="separator"></div>
            </div>
            <QrCode
                :data="requestLink"
                :size="400"
                :fill="'#1F2348' /* nimiq-blue */"
                class="qr-code"
            />
            <Copyable :text="`${origin}/${requestLink}`">
                {{ origin.replace(/https?:\/\//, '') }}/{{ requestLink }}
            </Copyable>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { PageHeader, PageBody, QrCode, Copyable } from '@nimiq/vue-components';
import { createRequestLink, CurrencyInfo, GeneralRequestLinkOptions, NimiqRequestLinkType } from '@nimiq/utils';
import { useSettingsStore } from '@/stores/Settings';
import AmountInput from '../../AmountInput.vue';
import AmountMenu from '../../AmountMenu.vue';
import FiatConvertedAmount from '../../FiatConvertedAmount.vue';
import { CryptoCurrency, FIAT_CURRENCIES_OFFERED } from '../../../lib/Constants';
import { useFiatStore } from '../../../stores/Fiat';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            validator: (currency: CryptoCurrency) => Object.values(CryptoCurrency).includes(currency),
        },
    },
    setup(props/* , context */) {
        const amount = ref(0);
        const message = ref('');
        const { btcUnit } = useSettingsStore();

        const requestLinkOptions = computed(() => ({
            type: props.currency === CryptoCurrency.NIM ? NimiqRequestLinkType.URI : undefined,
            amount: amount.value,
            currency: props.currency,
            message: message.value,
        } as GeneralRequestLinkOptions));

        const requestLink = computed(
            () => createRequestLink(props.address, requestLinkOptions.value),
        );

        const amountMenuOpened = ref(false);
        const activeCurrency = ref(props.currency);
        const fiatAmount = ref(0);

        const { state: fiat$, exchangeRates, currency: referenceCurrency } = useFiatStore();
        const otherFiatCurrencies = computed(() => FIAT_CURRENCIES_OFFERED.filter((fiat) => fiat !== fiat$.currency));

        const fiatCurrencyInfo = computed(() => {
            if (activeCurrency.value === CryptoCurrency.NIM || activeCurrency.value === CryptoCurrency.BTC) {
                return new CurrencyInfo(referenceCurrency.value);
            }
            return new CurrencyInfo(activeCurrency.value);
        });

        const fiatToCoinDecimalRatio = computed(() => 10 ** fiatCurrencyInfo.value.decimals
            / (props.currency === CryptoCurrency.NIM ? 1e5 : 1e8));

        watch(activeCurrency, (currency) => {
            if (currency === CryptoCurrency.NIM || currency === CryptoCurrency.BTC) {
                fiatAmount.value = 0;
                return;
            }

            // Fiat store already has all exchange rates for all supported fiat currencies
            // TODO: What to do when exchange rates are not yet populated?
            fiatAmount.value = amount.value
                * fiat$.exchangeRates[props.currency][currency]!
                * fiatToCoinDecimalRatio.value;
        });

        watch([activeCurrency, fiatAmount, exchangeRates, fiatToCoinDecimalRatio], () => {
            if (activeCurrency.value === CryptoCurrency.NIM || activeCurrency.value === CryptoCurrency.BTC) return;
            amount.value = Math.floor(
                fiatAmount.value
                / exchangeRates.value[props.currency][activeCurrency.value]!
                / fiatToCoinDecimalRatio.value);
        });

        return {
            origin: window.location.origin,
            amount,
            message,
            btcUnit,
            requestLink,
            amountMenuOpened,
            activeCurrency,
            fiatAmount,
            fiatCurrency: fiat$.currency,
            fiatCurrencyInfo,
            otherFiatCurrencies,
        };
    },
    components: {
        PageHeader,
        PageBody,
        QrCode,
        Copyable,
        AmountInput,
        AmountMenu,
        FiatConvertedAmount,
    },
});
</script>

<style lang="scss" scoped>
.payment-link-overlay {
    flex-grow: 1;
}

.page-header {
    padding: 4rem 3rem 2rem;

    div {
        font-size: var(--body-size);
        line-height: 1.4;
        font-weight: 600;
        opacity: 0.6;
        margin-top: 1rem;
    }
}

.page-body {
    padding: 1rem 3rem 2rem;
    justify-content: space-between;
    align-items: center;
    overflow: visible;
    flex-grow: 1;

    .dynamic-spacer {
        flex-grow: 1;
        max-height: 1rem;
    }

    .inputs {
        width: calc(100% + 4rem);
        margin: -1rem -2rem 1rem;

        .separator:first-child {
            height: 2px;
            margin-bottom: 1.5rem;
            box-shadow: inset 0 1.5px 0 var(--text-10);
        }

        .separator:last-child {
            height: 2px;
            margin-top: 1.5rem;
            box-shadow: inset 0 -1.5px 0 var(--text-10);
        }

        .amount-input {
            font-size: 5rem;

            ::v-deep .nim {
                font-size: 0.5em;
                margin-left: 0.5rem;
                margin-right: calc(-1.9em - 0.5rem);
            }

            ::v-deep .nq-input {
                padding: 0;
            }

            ::v-deep .width-finder {
                padding: 0 1rem;
            }
        }

        .amount-menu ::v-deep .menu {
            position: absolute;
            right: 3rem;
            bottom: 3rem;
            z-index: 1;
            max-height: calc(100% - 6rem);
        }

        .secondary-amount {
            font-weight: 600;
            opacity: 0.5;
            text-align: center;
            font-size: var(--body-size);
            margin-top: 0.5rem;

            .fiat-amount {
                margin-left: -0.2em;
            }
        }
    }

    .qr-code {
        flex-shrink: 1;
        // min-height: 0;

        // The QrCode is rendered at 2x size and then scaled to half its size,
        // to be sharp on retina displays:
        // 2 x 200px = 400px
        // But now we need to make it behave as half its size as well, that's
        // why we use negative margins on all sides (100px = 200px / 2).
        transform: scale(0.5);
        margin: -100px;
    }

    .copyable {
        flex-shrink: 0;
        max-width: 100%;
        word-wrap: break-word;
        color: var(--text-60);
        text-align: center;
        font-size: var(--body-size);
        margin-top: 1rem;
    }
}
</style>
