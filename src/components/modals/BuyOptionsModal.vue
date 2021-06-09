<template>
    <Modal class="buy-options-modal">
        <PageBody class="flex-column">
            <header>
                <h1 class="nq-h1">{{ $t('Buy NIM & BTC') }}</h1>
                <p class="nq-text">
                    {{ $t('Depending on your country of residence,\ndifferent options are available.') }}
                </p>
                <CountrySelector @select="c => country = c">
                    <div slot="trigger" class="pill flex-row">
                        <CountryFlag v-if="country" :code="country.code" />
                        <CircleSpinner v-else/>
                        <span v-if="country">{{ country.name }}</span>
                        <span v-else>{{ $t('Loading...') }}</span>
                        <img src="../../assets/arrow-down.svg" />
                    </div>
                </CountrySelector>
            </header>
            <div class="featured-options flex-row">
                <router-link :to="{ name: 'buy-crypto', query: $route.query }" replace
                    class="option oasis flex-column"
                    :class="{disabled: !isOasisAvailable}"
                    :event="isOasisAvailable ? 'click' : ''"
                    :tabindex="isOasisAvailable ? 0 : -1"
                >
                    <div class="upper-content flex-column">
                        <h2 class="nq-h1 flex-row">{{ $t('Bank Transfer') }}</h2>

                        <div class="pill flex-row">
                            <!-- eslint-disable max-len -->
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14" fill="currentColor">
                                <path d="M1.34 5.44l.86-.61.86.62-.33-1.01.85-.64H2.53L2.2 2.79l-.32 1.02H.81l.86.63zM3.33 3.43l.85-.63.86.63-.33-1.02.86-.63H4.51L4.18.77l-.33 1.01H2.79l.86.63zM6.14 2.66L7 2.03l.46.34.4.31-.33-1.03.86-.64H7.32L7 0l-.33 1.02H5.61l.86.63zM8.93 3.42l.86-.62.86.64-.33-1.03.46-.33.38-.3h-1.04L9.79.77l-.33 1.01H8.4l.85.63zM11.3 4.48l-.32 1.02.86-.63.86.64-.33-1.03.86-.63h-1.06l-.33-1.01-.33 1.01h-1.06zM14 6.69h-1.08l-.32-1.02-.33 1.02H11.2l.87.63-.33 1.02.86-.63.46.33.4.31-.33-1.03zM12.16 9.54l-.32-1.03-.33 1.03h-1.06l.85.63-.32 1 .86-.62.85.64-.32-1.03.87-.62zM10.11 11.58l-.32-1.01-.33 1.01H8.4l.85.64-.32 1 .86-.62.85.63-.33-1.02.87-.63zM7.34 12.34l-.33-1.01-.33 1.01H5.62l.85.63-.32 1.01.86-.63.87.65-.34-1.03.85-.63zM4.51 11.57l-.32-1.02-.33 1.02H2.8l.86.63-.32 1 .24-.17.61-.44.86.63-.33-1.02.86-.63zM2.71 10.15l.87-.63H2.5l-.32-1.01-.33 1.01H.79l.86.63-.33 1.02.86-.63.86.63zM1.41 7.67l.86.64-.32-1.04.85-.63H1.74l-.33-1.02-.33 1.02H0l.87.63-.33 1.02z"/>
                            </svg>
                            <!-- eslint-enable max-len -->
                            {{ $t('SEPA Instant only') }}
                        </div>

                        <p class="nq-text">
                            {{ $t('No registration – not even email.') }}
                        </p>
                    </div>

                    <div class="lower-content flex-column">
                        <div class="fees">
                            <span class="percentage flex-row">
                                1.25%
                                <svg viewBox="0 0 3 3" xmlns="http://www.w3.org/2000/svg" class="dot">
                                    <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor"/>
                                </svg>
                                <i18n path="min {amount}" tag="span">
                                    <FiatAmount slot="amount" :amount="0.10" currency="eur"/>
                                </i18n>
                            </span>
                            {{ $t('+ network fees') }}
                        </div>

                        <footer v-if="isOasisAvailable" class="flex-row">
                            <FlameIcon/>
                            {{ $t('Innovation\nby Nimiq') }}
                            <div class="flex-grow"></div>
                            <CaretRightIcon/>
                        </footer>
                        <footer v-else-if="isOasisUnderMaintenance" class="flex-row">
                            <MaintenanceIcon/>
                            {{ $t('Currently under maintenance') }}
                            <div class="flex-grow"></div>
                            <Tooltip preferredPosition="top left" :styles="{width: '25rem'}">
                                <InfoCircleSmallIcon slot="trigger"/>
                                {{ $t('TEN31’s banking infrastructure is undergoing scheduled maintenance.') }}
                                <!-- {{ $t('TEN31’s banking infrastructure is undergoing '
                                    + 'scheduled maintenance until the 24th of March.') }} -->
                            </Tooltip>
                        </footer>
                        <footer v-else class="flex-row">
                            <ForbiddenIcon/>
                            {{ $t('Not available in your country') }}
                            <div class="flex-grow"></div>
                            <Tooltip preferredPosition="top left" :styles="{width: '25rem'}">
                                <InfoCircleSmallIcon slot="trigger"/>
                                {{ $t('Bank Transfer is only supported in the EU’s SEPA area.') }}
                                <!-- {{ $t('Bank Transfer is only supported in the EU’s SEPA area, '
                                    + 'or in Central Americas SIMPE Banks.') }} -->
                                <!-- <p class="explainer">
                                    {{ $t('If you have contacts to a banking partner in your country, '
                                        + 'check out our application form')}}
                                </p> -->
                            </Tooltip>
                        </footer>
                    </div>
                </router-link>

                <router-link :to="{ name: isMoonpayAvailable ? 'moonpay' : 'simplex', query: $route.query }" replace
                    class="option credit-card flex-column"
                    :class="{disabled: !isCreditCardAvailable}"
                    :event="isCreditCardAvailable ? 'click' : ''"
                    :tabindex="isCreditCardAvailable ? 0 : -1"
                >
                    <div class="upper-content flex-column">
                        <h2 class="nq-h1 flex-row">{{ $t('Credit Card') }}</h2>

                        <p class="nq-text">
                            {{ $t('Full KYC required, high availability.') }}
                        </p>
                    </div>

                    <div class="lower-content flex-column">
                        <div class="fees">
                            <span v-if="isMoonpayAvailable" class="percentage flex-row">
                                4.5%
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
                            </span>
                            <span v-else-if="isSimplexAvailable" class="percentage flex-row">
                                ~8%
                                <svg viewBox="0 0 3 3" xmlns="http://www.w3.org/2000/svg" class="dot">
                                    <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor"/>
                                </svg>
                                <i18n path="min {amount}" tag="span">
                                    <FiatAmount slot="amount" :amount="5.00" :currency="FiatCurrency.USD" />
                                </i18n>
                            </span>
                            {{ $t('+ network fees') }}
                        </div>

                        <footer v-if="isMoonpayAvailable" class="moonpay flex-row">
                            <img src="../../assets/exchanges/moonpay-full.svg">
                            <CaretRightIcon/>
                        </footer>
                        <footer v-else-if="isSimplexAvailable" class="simplex flex-row">
                            <img src="../../assets/exchanges/simplex-full.png">
                            <CaretRightIcon/>
                        </footer>
                        <footer v-else class="flex-row">
                            <ForbiddenIcon/>
                            {{ $t('Not available in your country') }}
                        </footer>
                    </div>
                </router-link>
            </div>

            <p class="nq-text exchanges-note" :class="{'only-option': !isOasisAvailable && !isCreditCardAvailable}">
                {{ $t('Buy NIM on a crypto exchange:') }}
            </p>
            <div class="exchange-logos flex-row" :class="{'only-option': !isOasisAvailable && !isCreditCardAvailable}">
                <!-- eslint-disable max-len -->
                <a href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" title="KuCoin" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/kucoin.svg">
                </a>
                <a href="https://hitbtc.com/NIM-to-BTC" title="HitBTC" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/hitbtc.svg">
                </a>
                <a href="https://ascendex.com" title="AscendEX (BitMax)" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/ascendex.png">
                </a>
                <a href="https://changelly.com/exchange/btc/nim?ref_id=v06xmpbqj5lpftuj"
                    title="Changelly" target="_blank" rel="noopener"
                ><img src="../../assets/exchanges/changelly.svg">
                </a>
                <a href="https://www.bitladon.com/nimiq?r=100038211" title="Bitladon" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/bitladon.svg">
                </a>
                <a href="https://changehero.io/?to=nim" title="Changehero" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/changehero.svg">
                </a>
                <a href="https://btc-alpha.com/coin/NIM/" title="BTC-Alpha" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/btcalpha.svg">
                </a>
                <a href="https://coinswitch.co/?to=nim&ref=7OTBVXHK23" title="Coinswitch" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/coinswitch.svg">
                </a>
                <a href="https://coindcx.com/trade/NIMBTC" title="CoinDCX" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/coindcx.svg">
                </a>
                <a href="https://swapzone.io/?to=nim" title="Swapzone" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/swapzone.svg">
                </a>
                <a href="https://swapspace.co/?to=nim" title="SwapSpace" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/swapspace.svg">
                </a>
                <a href="https://www.coinspot.com.au/buy/nim" title="CoinSpot" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/coinspot.svg">
                </a>
                <!-- eslint-enable max-len -->
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from '@vue/composition-api';
import { PageBody, FiatAmount, Tooltip, InfoCircleSmallIcon, CircleSpinner } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import CountrySelector from '../CountrySelector.vue';
import CountryFlag from '../CountryFlag.vue';
import FlameIcon from '../icons/FlameIcon.vue';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import MaintenanceIcon from '../icons/MaintenanceIcon.vue';
import ForbiddenIcon from '../icons/ForbiddenIcon.vue';
import { useFiatStore } from '../../stores/Fiat';
import { FiatCurrency } from '../../lib/Constants';
import { useGeoIp } from '../../composables/useGeoIp';
import I18nDisplayNames from '../../lib/I18nDisplayNames';
import { MOONPAY_COUNTRY_CODES, SEPA_COUNTRY_CODES, SIMPLEX_COUNTRY_CODES } from '../../lib/Countries';

type Country = {
    code: string,
    name: string,
}

export default defineComponent({
    name: 'buy-options-modal',
    setup() {
        const { currency } = useFiatStore();

        const country = ref<Country>(null);

        const isOasisUnderMaintenance = ref(false);
        const isOasisAvailable = computed(() => {
            if (isOasisUnderMaintenance.value) return false;
            if (!country.value) return true;
            return SEPA_COUNTRY_CODES.includes(country.value.code);
        });

        const isMoonpayAvailable = computed(() => { // eslint-disable-line arrow-body-style
            if (!country.value) return true;
            return MOONPAY_COUNTRY_CODES.includes(country.value.code);
        });

        const isSimplexAvailable = computed(() => { // eslint-disable-line arrow-body-style
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
            country,
            isOasisAvailable,
            isOasisUnderMaintenance,
            isCreditCardAvailable,
            isMoonpayAvailable,
            isSimplexAvailable,
            currency,
            FiatCurrency,
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
        FlameIcon,
        MaintenanceIcon,
        Tooltip,
        InfoCircleSmallIcon,
        ForbiddenIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    width: 63.5rem !important;
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
        z-index: 100;
        display: inline-block;
        margin-bottom: 3rem;

        /deep/ .trigger {
            &:hover,
            &:focus {
                .pill {
                    box-shadow: 0 0 0 1.5px var(--text-40);
                    color: var(--text-100);
                }
            }
        }
    }

    .country-flag,
    /deep/ .circle-spinner {
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
}

.option {
    width: 50%;
    height: 36rem;
    justify-content: flex-start;
    align-items: stretch;
    margin: 1rem;
    border-radius: 0.75rem;
    padding: 2.5rem 3rem;
    text-decoration: none;
    color: white;

    transition:
        transform 0.3s var(--nimiq-ease),
        box-shadow 0.3s var(--nimiq-ease),
        background-color 0.3s var(--nimiq-ease);
    will-change: transform, box-shadow;

    &::before {
        position: absolute;
        content: "";
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        border-radius: inherit;
        z-index: -1;
        transition: opacity 0.3s var(--nimiq-ease);
        opacity: 0;
    }

    &:hover,
    &:focus {
        transform: translate3D(0, -0.5rem, 0);
        box-shadow:
            0px 18px 38px rgba(31, 35, 72, 0.07),
            0px 7px 8.5px rgba(31, 35, 72, 0.04),
            0px 2px 2.5px rgba(31, 35, 72, 0.02);

        &::before {
            opacity: 1;
        }
    }

    &.oasis {
        background-color: var(--nimiq-blue);
        background-image: var(--nimiq-blue-bg);

        &::before {
            background-color: var(--nimiq-blue-darkened);
            background-image: var(--nimiq-blue-bg-darkened);
        }
    }

    &.credit-card {
        background-color: var(--nimiq-light-blue);
        background-image: var(--nimiq-light-blue-bg);

        &::before {
            position: absolute;
            background-color: var(--nimiq-light-blue-darkened);
            background-image: var(--nimiq-light-blue-bg-darkened);
        }
    }

    .nq-h1 {
        align-items: center;
        margin: 0;
        line-height: 1.3;
        font-weight: bold;
        font-size: var(--h1-size);
    }

    .pill {
        margin-top: 1.5rem;
        box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.8);
    }

    .nq-text {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.25;
    }

    .nq-h1 + .nq-text {
        margin-top: 1rem;
    }

    .upper-content {
        flex-grow: 1;
    }

    .lower-content {
        justify-content: space-between;
    }

    .fees {
        font-size: var(--small-size);
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 3rem;
        hyphens: manual;

        .percentage {
            align-items: center;
            font-size: var(--h2-size);
            color: white;

            .dot {
                width: 0.5rem;
                height: 0.5rem;
                opacity: 0.5;
                margin: 0 0.75rem;
            }
        }
    }

    footer {
        align-items: center;
        font-size: var(--small-label-size);
        line-height: 1;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.65);
        height: 3.25rem;
        margin-bottom: 0.25rem;
        white-space: pre-line;

        .flex-grow {
            @media (min-width: 700px) { // Full mobile breakpoint
                min-width: 2rem;
            }
        }

        > svg:last-child {
            color: rgba(255, 255, 255, 0.6);
            flex-shrink: 0;
            margin-left: 0.5rem;
            transition: color 0.3s var(--nimiq-ease), transform 0.3s var(--nimiq-ease);
            will-change: transform, color;
        }
    }

    &:hover,
    &:focus {
        footer > svg:last-child {
            color: rgba(255, 255, 255, 0.8);
            transform: translateX(0.25rem);
        }
    }
}

.oasis {
    .pill svg {
        margin: 0 0.5rem 0 -0.5rem;
        flex-shrink: 0;
    }

    footer {
        > svg:first-child {
            width: 1.75rem;
            height: 2.5rem;
            margin-right: 1rem;
            flex-shrink: 0;

            path {
                fill: currentColor;
            }
        }
    }
}

.credit-card {
    footer {
        justify-content: space-between;

        img {
            width: 10.5rem;
        }

        &.moonpay img {
            margin-top: -0.75rem;
            opacity: 0.6;
            filter: invert(100%); // Black logo into white
        }

        &.simplex img {
            opacity: 0.7;
            filter: brightness(0) invert(1);; // Colored logo into white
        }
    }
}

.option.disabled {
    pointer-events: none;
    transition: none;
    transform: none;
    box-shadow: 0 0 0 1.5px var(--text-10);
    background: none;
    color: var(--text-25);

    &::before {
        display: none;
    }

    * {
        color: inherit !important;
    }

    .pill {
        box-shadow: 0 0 0 1.5px var(--text-10);
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
            pointer-events: all;
            font-size: 2.25rem;
        }
    }
}

.exchanges-note {
    color: var(--text-50);
    font-size: var(--small-size);
    font-weight: 600;

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

@media (max-width: 700px) and (min-width: 360px) { // Full mobile breakpoint
    .option {
        flex-direction: row;

        .upper-content {
            margin-right: 2rem;
        }

        .lower-content {
            width: 13rem;
            flex-shrink: 0;
        }

        .nq-text {
            max-width: 30rem;
            margin-bottom: 0;
        }

        .fees .percentage {
            flex-direction: column;
            align-items: flex-start;

            .dot {
                display: none;
            }
        }

        &.credit-card {
            footer {
                margin-bottom: 0;

                img {
                    width: 9.5rem;
                    margin-top: -0.625rem;
                }
            }
        }
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .modal /deep/ .small-page {
        // Regular Modal size (iOS scrolling inside the BuyOptionsModal does not work without a fixed height)
        min-height: unset !important;
    }

    .page-body {
        padding: 1.5rem;
        flex-direction: column;
        mask: linear-gradient(0deg , white, white calc(100% - 3.75rem), rgba(255,255,255, 0) calc(100% - 0.75rem));
        padding: 1rem 1.25rem 2.25rem;
    }

    .featured-options {
        flex-direction: column;
    }

    .option {
        margin: 1rem;
        width: unset;
        height: unset;
    }

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
