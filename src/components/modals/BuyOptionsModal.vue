<template>
    <Modal class="buy-options-modal">
        <PageBody class="flex-column">
            <header>
                <h1 class="nq-h1" v-if="stablecoin">
                    {{ $t('Buy NIM, BTC & {ticker}', { ticker: stablecoin.toUpperCase()}) }}
                </h1>
                <h1 class="nq-h1" v-else>{{ $t('Buy NIM & BTC') }}</h1>
                <p class="nq-text">
                    {{ $t('Depending on your country of residence,\ndifferent options are available.') }}
                </p>
                <CountrySelector @select="c => country = c">
                    <div slot="trigger" class="pill flex-row">
                        <CountryFlag v-if="country" :code="country.code" />
                        <CircleSpinner v-else />
                        <img src="../../assets/mini-arrow-down.svg" alt="open" />
                    </div>
                </CountrySelector>
            </header>
            <div class="featured-options flex-row">
                <Component :is="isSimplexAvailable ? 'router-link' : 'span'"
                    :to="{ name: 'simplex', query: $route.query }" replace
                    class="option simplex flex-column"
                    :class="{disabled: !isSimplexAvailable}"
                >
                    <img src="../../assets/exchanges/simplex-full.png" class="logo" alt="Simplex">

                    <div class="fees">
                        <div>{{ $t('Bank Transfer') }}</div>
                        <div>
                            1%<br>
                            <i18n path="min {amount}" tag="span" class="low">
                                <FiatAmount slot="amount"
                                    :amount="3.00"
                                    :currency="[FiatCurrency.EUR, FiatCurrency.GBP].includes(currency)
                                        ? currency
                                        : FiatCurrency.USD"
                                />
                            </i18n>
                        </div>

                        <div>
                            {{ $t('Credit Card') }}<br>
                            {{ $t('Apple/Google Pay') }}
                            <!-- <span class="low">Visa, Mastercard</span> -->
                        </div>
                        <div>
                            4%<br>
                            <i18n path="min {amount}" tag="span" class="low">
                                <FiatAmount slot="amount"
                                    :amount="3.50"
                                    :currency="[FiatCurrency.EUR, FiatCurrency.GBP].includes(currency)
                                        ? currency
                                        : FiatCurrency.USD"
                                />
                            </i18n>
                        </div>

                        <template v-if="country && country.code === 'BR'">
                            <div>PIX</div>
                            <div>2.99%</div>
                        </template>

                        <template v-if="country && country.code === 'US'">
                            <div>ACH</div>
                            <div>
                                1.5%<br>
                                <i18n path="min {amount}" tag="span" class="low">
                                    <FiatAmount slot="amount"
                                        :amount="3.00"
                                        :currency="[FiatCurrency.EUR, FiatCurrency.GBP].includes(currency)
                                            ? currency
                                            : FiatCurrency.USD"
                                    />
                                </i18n>
                            </div>
                        </template>
                    </div>

                    <footer v-if="isSimplexAvailable" class="flex-row">
                        {{ $t('+ network fees, registration required above $700') }}
                        <div class="flex-grow"></div>
                        <CaretRightIcon/>
                    </footer>
                    <footer v-else class="flex-row">
                        <ForbiddenIcon/>
                        {{ $t('Not available in your country') }}
                    </footer>
                </Component>

                <Component :is="isMoonpayAvailable ? 'router-link' : 'span'"
                    :to="{ name: 'moonpay', query: $route.query }" replace
                    class="option moonpay flex-column"
                    :class="{disabled: !isMoonpayAvailable}"
                >
                    <img src="../../assets/exchanges/moonpay-mono.svg" class="logo" alt="Moonpay">

                    <div class="fees">
                        <div>{{ $t('Bank Transfer') }}</div>
                        <div>
                            1%<br>
                            <i18n path="min {amount}" tag="span" class="low">
                                <FiatAmount slot="amount"
                                    :amount="3.99"
                                    :currency="[FiatCurrency.EUR, FiatCurrency.GBP].includes(currency)
                                        ? currency
                                        : FiatCurrency.USD"
                                />
                            </i18n>
                        </div>

                        <div>
                            {{ $t('Credit Card') }}<br>
                            {{ $t('Apple/Google Pay') }}
                            <!-- <span class="low">Visa, Mastercard</span> -->
                        </div>
                        <div>
                            4.5%<br>
                            <i18n path="min {amount}" tag="span" class="low">
                                <FiatAmount slot="amount"
                                    :amount="3.99"
                                    :currency="[FiatCurrency.EUR, FiatCurrency.GBP].includes(currency)
                                        ? currency
                                        : FiatCurrency.USD"
                                />
                            </i18n>
                        </div>

                        <template v-if="country && country.code === 'BR'">
                            <div>PIX</div>
                            <div>2.95%</div>
                        </template>

                        <template v-if="country && country.code === 'GB'">
                            <div>Faster Payments</div>
                            <div>1%</div>
                        </template>

                        <template v-if="country && country.code === 'NG'">
                            <div>YellowCard</div>
                            <div>1.5%</div>
                        </template>
                    </div>

                    <footer v-if="isMoonpayAvailable" class="flex-row">
                        {{ $t('+ network fees, registration required') }}
                        <div class="flex-grow"></div>
                        <CaretRightIcon/>
                    </footer>
                    <footer v-else class="flex-row">
                        <ForbiddenIcon/>
                        {{ $t('Not available in your country') }}
                    </footer>
                </Component>
            </div>

            <p class="nq-text exchanges-note" :class="{'only-option': !isCreditCardAvailable}">
                {{ $t('Buy NIM on a crypto exchange:') }}
            </p>
            <div class="exchange-logos flex-row" :class="{'only-option': !isCreditCardAvailable}">
                <!-- eslint-disable max-len -->
                <a href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" title="KuCoin" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/kucoin.svg" alt="KuCoin">
                </a>
                <a href="https://www.gate.io/de/trade/NIM_USDT" title="Gate.io" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/gateio.svg" alt="Gate.io">
                </a>
                <a href="https://www.mexc.com/exchange/NIM_USDT" title="MEXC" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/mexc.svg" alt="MEXC">
                </a>
                <a href="https://ascendex.com" title="AscendEX (BitMax)" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/ascendex.png" alt="AscendEX">
                </a>
                <a href="https://hitbtc.com/NIM-to-BTC" title="HitBTC" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/hitbtc.svg" alt="HitBTC">
                </a>
                <a href="https://stealthex.io/?to=NIM" title="StealthEx" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/stealthex.svg" alt="StealthEx">
                </a>
                <a href="https://changelly.com/exchange/btc/nim?ref_id=v06xmpbqj5lpftuj"
                    title="Changelly" target="_blank" rel="noopener"
                ><img src="../../assets/exchanges/changelly.svg" alt="Changelly">
                </a>
                <a href="https://changehero.io/?to=NIM" title="Changehero" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/changehero.svg" alt="Changehero">
                </a>
                <a href="https://coinswitch.co/?to=nim&ref=7OTBVXHK23" title="Coinswitch" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/coinswitch.svg" alt="Coinswitch">
                </a>
                <a href="https://swapzone.io/?to=nim" title="Swapzone" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/swapzone.svg" alt="Swapzone">
                </a>
                <a href="https://swapspace.co/?to=nim" title="SwapSpace" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/swapspace.svg" alt="SwapSpace">
                </a>
                <a href="https://www.coinspot.com.au/buy/nim" title="CoinSpot" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/coinspot.svg" alt="CoinSpot">
                </a>
                <!-- eslint-enable max-len -->
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue';
import { PageBody, FiatAmount, CircleSpinner } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import CountrySelector from '../CountrySelector.vue';
import CountryFlag from '../CountryFlag.vue';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import ForbiddenIcon from '../icons/ForbiddenIcon.vue';
import { useFiatStore } from '../../stores/Fiat';
import { FiatCurrency } from '../../lib/Constants';
import { useConfig } from '../../composables/useConfig';
import { useGeoIp } from '../../composables/useGeoIp';
import I18nDisplayNames from '../../lib/I18nDisplayNames';
import { MOONPAY_COUNTRY_CODES, SIMPLEX_COUNTRY_CODES } from '../../lib/Countries';
import { useSettingsStore } from '../../stores/Settings';
import { useAccountSettingsStore } from '../../stores/AccountSettings';
// import { Trial } from '../../lib/Trials';

type Country = {
    code: string,
    name: string,
}

export default defineComponent({
    name: 'buy-options-modal',
    setup() {
        const { currency } = useFiatStore();
        const { canUseSwaps/* , trials */ } = useSettingsStore();
        const { stablecoin } = useAccountSettingsStore();
        const { config } = useConfig();

        const country = ref<Country>(null);

        const isMoonpayAvailable = computed(() => { // eslint-disable-line arrow-body-style
            if (!config.moonpay.enabled) return false;
            if (!country.value) return true;
            return MOONPAY_COUNTRY_CODES.includes(country.value.code);
        });

        const isSimplexAvailable = computed(() => { // eslint-disable-line arrow-body-style
            if (!config.simplex.enabled) return false;
            if (!country.value) return true;
            return SIMPLEX_COUNTRY_CODES.includes(country.value.code);
        });

        const isCreditCardAvailable = computed(() => isMoonpayAvailable.value || isSimplexAvailable.value);

        const i18nCountryName = new I18nDisplayNames('region');

        onMounted(async () => {
            const { locate } = useGeoIp();
            const geo = await locate();
            const code = geo.country;
            if (!code) return;

            country.value = {
                code,
                name: i18nCountryName.of(code) || '',
            };
        });

        return {
            stablecoin,
            country,
            isMoonpayAvailable,
            isSimplexAvailable,
            isCreditCardAvailable,
            currency,
            FiatCurrency,
            canUseSwaps,
        };
    },
    components: {
        Modal,
        PageBody,
        FiatAmount,
        CaretRightIcon,
        CountrySelector,
        CircleSpinner,
        CountryFlag,
        ForbiddenIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";
@import '../../scss/functions.scss';

.modal ::v-deep .small-page {
    width: 70rem !important;
    min-height: 63.5rem !important;
    max-width: 100vw;
}

.page-body {
    padding: 2rem;
    align-items: center;
}

header {
    text-align: center;

    .nq-h1 {
        margin: 2rem 0 1.25rem;
    }

    .nq-text {
        white-space: pre-line;
        margin-top: 0;
        margin-bottom: 1.25rem;
        color: var(--text-100);
    }

    .country-selector {
        position: absolute;
        top: 2rem;
        left: 2rem;
        z-index: 100;
        display: inline-block;
        margin-bottom: 3rem;

        ::v-deep .trigger {
            &:hover,
            &:focus {
                .pill {
                    box-shadow: 0 0 0 1.5px var(--text-40);
                    color: var(--text-100);
                }
            }
        }

        ::v-deep .dropdown {
            left: 0;
            transform: translateX(0);
        }
    }

    .country-flag,
    ::v-deep .circle-spinner {
        width: 2rem;
        height: 2rem;
        margin: 0.25rem 0.625rem 0.25rem -0.75rem;
    }

    img:last-child {
        margin-left: 0.5rem;
        margin-right: -0.5rem;
        margin-bottom: -0.25rem;
    }
}

.pill {
    align-self: flex-start;
    align-items: center;
    font-size: var(--small-size);
    font-weight: 600;
    border-radius: 5rem;
    padding: 0.25rem 1.25rem;

    box-shadow: 0 0 0 1.5px var(--text-20);
    color: var(--text-60);

    transition:
        box-shadow 0.2s var(--nimiq-ease),
        color 0.2s var(--nimiq-ease);
}

.featured-options {
    flex-grow: 1;
    align-self: stretch;
    overflow-x: auto;
    margin: 0 -2rem;
    padding: 0 2rem 2rem;
}

.option {
    width: 50%;
    min-width: 31rem;
    height: 36rem;
    justify-content: space-between;
    align-items: stretch;
    margin: 1rem;
    border-radius: 0.75rem;
    padding: 3rem;
    text-decoration: none;
    color: white;
    gap: 3rem;

    transition:
        transform 0.3s var(--nimiq-ease),
        box-shadow 0.3s var(--nimiq-ease),
        background-color 0.3s var(--nimiq-ease);
    will-change: transform, box-shadow;

    &:hover,
    &:focus {
        transform: translate3D(0, -0.5rem, 0);
        box-shadow:
            0px 18px 38px nimiq-blue(0.07),
            0px 7px 8.5px nimiq-blue(0.04),
            0px 2px 2.5px nimiq-blue(0.02);
    }

    &.simplex {
        background-color: #081F2C;

        .logo {
            width: 9.5rem;
        }
    }

    &.moonpay {
        background-color: #7D00FF;
        .logo {
            width: 11.5rem;
        }
    }

    .nq-h1 {
        align-items: center;
        margin: 0;
        line-height: 1.3;
        font-weight: bold;
        font-size: var(--h1-size);
    }

    .nq-text {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.25;
    }

    .nq-h1 + .nq-text {
        margin-top: 1rem;
    }

    .fees {
        display: grid;
        grid-template-columns: auto max-content;
        gap: 2rem 1rem;
        font-size: var(--small-size);
        font-weight: 600;
        hyphens: manual;

        .low {
            opacity: 0.5;
        }
    }

    &.moonpay .fees .low {
        opacity: 0.7;
    }

    footer {
        font-size: var(--small-label-size);
        line-height: 1;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.7);
        white-space: pre-line;
        align-items: center;

        .flex-grow {
            min-width: 2rem;
        }

        > svg:last-child {
            color: rgba(255, 255, 255, 0.6);
            flex-shrink: 0;
            margin-left: 0.5rem;
            transition: color 0.3s var(--nimiq-ease), transform 0.3s var(--nimiq-ease);
            will-change: transform, color;
        }
    }

    &:not(.disabled):hover,
    &:not(.disabled):focus {
        footer > svg:last-child {
            color: rgba(255, 255, 255, 0.8);
            transform: translateX(0.25rem);
        }
    }
}

.option.disabled {
    transition: none;
    transform: none;
    box-shadow: 0 0 0 1.5px var(--text-10);
    background: none;
    color: var(--text-25);

    * {
        color: inherit !important;
    }

    .logo {
        filter: invert(1);
        opacity: 0.25;
    }

    footer {
        color: var(--text-40) !important;

        > svg:first-child {
            width: 2.5rem;
            height: 2.5rem;
            flex-shrink: 0;
            margin-right: 1rem;

            // To prevent overlapping opacities in ForbiddenIcon
            color: var(--text-100) !important;
            opacity: 0.4;
        }

        .tooltip {
            font-size: 2.25rem;
        }
    }
}

.exchanges-note {
    color: var(--text-50);
    font-size: var(--small-size);
    font-weight: 600;
    margin-top: 0;

    &.only-option {
        color: var(--text-100);
    }
}

.exchange-logos {
    align-self: stretch;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem 2rem;

    &:not(.only-option) a {
        filter: saturate(0);
        opacity: 0.6;

        transition:
            filter 0.2s var(--nimiq-ease),
            opacity 0.2s var(--nimiq-ease);

        &:hover,
        &:focus {
            filter: saturate(1);
            opacity: 1;
        }
    }

    img {
        width: 3rem;
        max-width: 3rem;
        max-height: 3rem;
        display: block;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .modal ::v-deep .small-page {
        // Regular Modal size (iOS scrolling inside the BuyOptionsModal does not work without a fixed height)
        min-height: unset !important;
    }

    .page-body {
        padding: 1.5rem;
        flex-direction: column;
        mask: linear-gradient(0deg , white, white calc(100% - 3.75rem), rgba(255,255,255, 0) calc(100% - 0.75rem));
        padding: 1rem 1.25rem 2.25rem;
    }

    // .option {
    //     margin: 1rem;
    //     width: unset;
    //     height: unset;
    // }

    .exchange-logos {
        overflow-x: auto;

        a {
            opacity: 1;
            filter: none;
        }

        a + a {
            margin-left: 2rem;
        }

        a:last-child {
            padding-right: 2rem;
        }
    }
}
</style>
