<template>
    <Modal class="buy-options-modal">
        <PageBody class="flex-column">
            <header>
                <h1 class="nq-h1">{{ $t('Buy NIM & BTC') }}</h1>
            </header>
            <div class="featured-exchanges flex-row">
                <router-link to="/buy-crypto?sidebar=true" replace class="option oasis flex-column">
                    <div class="top flex-column">
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
                            {{ $t('Pay by bank transfer. No registration – not even email.') }}
                        </p>
                    </div>

                    <div class="bottom flex-column">
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

                        <footer class="flex-row">
                            <FlameIcon/>
                            {{ $t('Innovation\nby Nimiq') }}
                            <div class="flex-grow"></div>
                            <CaretRightIcon/>
                        </footer>
                    </div>
                </router-link>

                <router-link to="/moonpay?sidebar=true" replace class="option credit-card flex-column">
                    <div class="top flex-column">
                        <h2 class="nq-h1 flex-row">{{ $t('Credit Card') }}</h2>

                        <div class="pill flex-row">
                            {{ $t('Almost everywhere') }}
                        </div>

                        <p class="nq-text">
                            {{ $t('Pay with credit card. Full KYC required, high availability.') }}
                        </p>
                    </div>

                    <div class="bottom flex-column">
                        <div class="fees">
                            <span class="percentage flex-row">
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
                            {{ $t('+ network fees') }}
                        </div>

                        <footer class="flex-row">
                            <img src="../../assets/exchanges/moonpay-full.svg">
                            <CaretRightIcon/>
                        </footer>
                    </div>
                </router-link>
            </div>

            <p class="nq-text exchanges-note">{{ $t('Buy NIM on a crypto exchange:') }}</p>
            <div class="exchange-logos flex-row">
                <!-- eslint-disable max-len -->
                <a href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" title="KuCoin" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/kucoin.svg">
                </a>
                <a href="https://hitbtc.com/NIM-to-BTC" title="HitBTC" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/hitbtc.svg">
                </a>
                <a href="https://bitmax.io" title="BitMax" target="_blank" rel="noopener">
                    <img src="../../assets/exchanges/bitmax.svg">
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
import { defineComponent } from '@vue/composition-api';
import { PageBody, FiatAmount } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import FlameIcon from '../icons/FlameIcon.vue';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import { useFiatStore } from '../../stores/Fiat';
import { FiatCurrency } from '../../lib/Constants';

export default defineComponent({
    name: 'buy-options-modal',
    setup() {
        const { currency } = useFiatStore();

        return {
            currency,
            FiatCurrency,
        };
    },
    components: {
        Modal,
        PageBody,
        FiatAmount,
        CaretRightIcon,
        FlameIcon,
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

    header {
        text-align: center;
    }

    .nq-h1 {
        margin: 2rem 0 3rem;
        font-size: var(--h1-size);
    }
}

.featured-exchanges {
    flex-grow: 1;
    align-self: stretch;
}

.option {
    width: 50%;
    justify-content: flex-start;
    align-items: stretch;
    margin: 1rem;
    border-radius: 0.75rem;
    padding: 2.5rem 3rem;
    text-decoration: none;

    transition:
        transform 0.3s var(--nimiq-ease),
        box-shadow 0.3s var(--nimiq-ease),
        background-color 0.3s var(--nimiq-ease);
    will-change: transform, box-shadow;

    &:hover,
    &:focus {
        transform: translate3D(0, -0.5rem, 0);
    }

    &.oasis {
        background-color: var(--nimiq-light-blue);
        background-image: var(--nimiq-light-blue-bg);
        color: white;
        z-index: 1;

        &::before {
            position: absolute;
            content: "";
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            border-radius: inherit;
            background-color: var(--nimiq-light-blue-darkened);
            background-image: var(--nimiq-light-blue-bg-darkened);
            z-index: -1;
            transition: opacity 0.3s var(--nimiq-ease);
            opacity: 0;
        }

        &:hover,
        &:focus {
            box-shadow:
                0px 18px 38px rgba(31, 35, 72, 0.07),
                0px 7px 8.5px rgba(31, 35, 72, 0.04),
                0px 2px 2.5px rgba(31, 35, 72, 0.02);

            &::before {
                opacity: 1;
            }
        }
    }

    &.credit-card {
        background-color: var(--nimiq-highlight-bg);
        color: inherit;

        &:hover,
        &:focus {
            background-color: rgba(31, 35, 72, 0.1); /* Based on Nimiq Blue */
        }
    }

    .nq-h1 {
        align-items: center;
        margin: 0 0 1.5rem;
        line-height: 1.3;
        font-weight: bold;
        font-size: var(--h1-size);
    }

    .pill {
        align-self: flex-start;
        align-items: center;
        font-size: var(--small-size);
        font-weight: 600;
        box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.3);
        color: rgba(255, 255, 255, 0.8);
        border-radius: 5rem;
        padding: 0.25rem 1.25rem;
    }

    .nq-text {
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.25;
    }

    .top {
        flex-grow: 1;
    }

    .bottom {
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
        font-weight: bold;
        color: rgba(255, 255, 255, 0.65);
        height: 3.25rem;
        margin-bottom: 0.25rem;
        white-space: pre-line;

        svg:last-child {
            color: rgba(255, 255, 255, 0.6);
            flex-shrink: 0;
            margin-left: 0.5rem;
            transition: color 0.3s var(--nimiq-ease), transform 0.3s var(--nimiq-ease);
            will-change: transform, color;
        }
    }

    &:hover,
    &:focus {
        footer svg:last-child {
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
        svg:first-child {
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
    .pill {
        box-shadow: 0 0 0 1.5px var(--text-20);
    }

    .pill,
    .nq-text,
    .fees,
    footer {
        color: var(--text-60);
    }

    .fees {
        .percentage {
            color: var(--text-100);
        }
    }

    footer {
        justify-content: space-between;

        img {
            width: 10.5rem;
            margin-top: -0.75rem;
            opacity: 0.55;
            // Generated with https://codepen.io/sosuke/full/Pjoqqp to make black into ~nimiq-blue
            filter: invert(13%) sepia(8%) saturate(5326%) hue-rotate(199deg) brightness(99%) contrast(96%);
        }

        svg:last-child {
            color: var(--text-40);
        }
    }

    &:hover,
    &:focus {
        footer svg:last-child {
            color: var(--text-80);
        }
    }
}

.exchanges-note {
    color: var(--text-50);
    font-size: var(--small-size);
    font-weight: 600;
}

.exchange-logos {
    align-self: stretch;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem 2rem;

    a {
        filter: saturate(0);
        opacity: 0.6;

        transition:
            filter 0.2s var(--nimiq-ease),
            opacity 0.2s var(--nimiq-ease);

        img {
            width: 3rem;
            max-width: 3rem;
            max-height: 3rem;
            display: block;
        }

        &:hover,
        &:focus {
            filter: saturate(1);
            opacity: 1;
        }
    }
}

@media (max-width: 700px) and (min-width: 360px) { // Full mobile breakpoint
    .option {
        flex-direction: row;

        .top {
            margin-right: 2rem;
        }

        .bottom {
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
        padding: 2.25rem 1.25rem;
    }

    .featured-exchanges {
        flex-direction: column;
    }

    .option {
        margin: 1rem;
        width: unset;
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
