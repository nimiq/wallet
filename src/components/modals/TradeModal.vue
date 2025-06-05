<template>
    <Modal class="trade-modal">
        <PageBody class="flex-column">
            <!-- eslint-disable max-len -->
            <div class="exchange-area flex-column">
                <header>
                    <h1 class="nq-h1">{{ $t('Trade NIM and BTC') }}</h1>
                    <i18n :path="'There are many options, use a credit card or trade\u00a0crypto. You can find more exchanges on {link}'"
                        tag="p" class="nq-text intro"
                    >
                        <template v-slot:link>
                            <a href="https://nimiq.com/exchanges" class="nq-link" target="_blank" rel="noopener">
                                nimiq.com/exchanges
                            </a>
                        </template>
                    </i18n>
                </header>
                <div class="featured-exchanges flex-row">
                    <div class="exchange kucoin flex-column">
                        <h2 class="nq-h1 flex-row">
                            <img src="../../assets/exchanges/kucoin.svg" alt="KuCoin">
                            KuCoin
                            <a class="nq-button-pill light-blue flex-row"
                                href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" target="_blank" rel="noopener"
                                @mousedown.prevent
                            >{{ $t('Get NIM') }}<ArrowRightSmallIcon/></a>
                        </h2>
                        <ul>
                            <li>{{ $t('24/7 Support') }}</li>
                            <li>{{ $t('Android and iOS App') }}</li>
                        </ul>
                        <div class="flex-grow"></div>
                        <a class="nq-button-pill light-blue flex-row"
                            href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" target="_blank" rel="noopener"
                            @mousedown.prevent
                        >{{ $t('To {exchange}', { exchange: 'KuCoin' }) }}<ArrowRightSmallIcon/></a>
                    </div>
                    <div class="separator"></div>
                    <div class="exchange changehero flex-column">
                        <h2 class="nq-h1 flex-row">
                            <img src="../../assets/exchanges/changehero.svg" alt="ChangeHero">
                            ChangeHero
                            <a class="nq-button-pill light-blue flex-row"
                                href="https://changehero.io/?to=NIM" target="_blank" rel="noopener"
                                @mousedown.prevent
                            >{{ $t('Get NIM') }}<ArrowRightSmallIcon/></a>
                        </h2>
                        <ul>
                            <li>{{ $t('For beginners') }}</li>
                            <li>{{ $t('No registration') }}</li>
                        </ul>
                        <div class="flex-grow"></div>
                        <a class="nq-button-pill light-blue flex-row"
                            href="https://changehero.io/?to=nim" target="_blank" rel="noopener"
                            @mousedown.prevent
                        >{{ $t('To {exchange}', { exchange: 'ChangeHero' }) }}<ArrowRightSmallIcon/></a>
                    </div>
                </div>
                <div class="exchange-logos flex-row">
                    <a href="https://hitbtc.com/NIM-to-BTC" title="HitBTC" target="_blank" rel="noopener">
                        <img src="../../assets/exchanges/hitbtc.svg" alt="HitBTC">
                    </a>
                    <a href="https://ascendex.com" title="AscendEX (BitMax)" target="_blank" rel="noopener">
                        <img src="../../assets/exchanges/ascendex.png" alt="AscendEX">
                    </a>
                    <a href="https://stealthex.io/?to=NIM" title="StealthEx" target="_blank" rel="noopener">
                        <img src="../../assets/exchanges/stealthex.svg" alt="StealthEx">
                    </a>
                    <a href="https://changelly.com/exchange/btc/nim?ref_id=v06xmpbqj5lpftuj"
                        title="Changelly" target="_blank" rel="noopener"
                    ><img src="../../assets/exchanges/changelly.svg" alt="Changelly">
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
                </div>
            </div>
            <!-- eslint-enable max-len -->
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { PageBody, ArrowRightSmallIcon } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    name: 'trade-modal',
    components: {
        Modal,
        PageBody,
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

.modal ::v-deep .small-page {
    width: 65rem !important;
    min-height: 60rem !important;
    max-width: 100vw;
}

.page-body {
    padding: 0.75rem;
    flex-direction: row-reverse;
}

.exchange-area {
    flex-grow: 1;
    padding: 3.25rem;
    align-items: center;
    justify-content: space-between;

    header {
        text-align: center;
    }

    .nq-h1 {
        margin: 0;
    }

    .intro {
        color: inherit;
        max-width: 50rem;
        line-height: 1.4;
        margin-top: 1rem;

        .nq-link {
            font-weight: 600;
        }
    }
}

.featured-exchanges {
    .nq-h1 {
        font-weight: 600;
    }

    .separator {
        height: 100%;
        width: 2px;
        box-shadow: inset 1.5px 0 var(--text-14);
        margin: 0 3.5rem;
    }

    .exchange {
        width: 25%;
        align-items: flex-start;
        margin: 1rem 0 2rem;

        h2 {
            align-items: center;

            .nq-button-pill {
                display: none;
            }
        }

        img {
            margin-right: 1.5rem;
        }

        &.kucoin {
            flex-grow: 1;

            h2 img {
                height: 3rem;
            }
        }

        &.changehero {
            flex-grow: 1.2;

            h2 img {
                height: 4rem;
            }
        }

        .nq-button-pill {
            align-items: center;

            .nq-icon {
                width: 1.25rem;
                margin-left: 0.75rem;

                transition: transform 0.2s var(--nimiq-ease);
            }

            &:hover,
            &:focus {
                .nq-icon {
                    transform: translateX(0.25rem);
                }
            }
        }
    }

    ul {
        font-size: var(--body-size);
        padding-left: 2.25rem;
        list-style-image: url('../../assets/green-plus.svg');
    }

    li {
        margin-bottom: 1.5rem;
    }
}

.exchange-logos {
    align-self: stretch;
    justify-content: space-between;
    align-items: center;

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

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .page-body {
        flex-direction: column;
        mask: linear-gradient(0deg , white, white calc(100% - 3.75rem), rgba(255,255,255, 0) calc(100% - 0.75rem));
    }

    .exchange-area {
        flex-shrink: 0;
        padding: 2.25rem 1.25rem;
        align-items: stretch;

        .intro {
            max-width: unset;
            margin-bottom: 4rem;
        }
    }

    .featured-exchanges {
        flex-direction: column;

        .separator {
            height: 2px;
            width: 100%;
            box-shadow: inset 0 1.5px var(--text-14);
            margin: 3rem 0;
        }

        .exchange {
            margin: 0 1rem;
            width: unset;

            h2 {
                align-self: stretch;

                .nq-button-pill {
                    display: flex;
                    margin-left: auto;
                }
            }

            > .nq-button-pill {
                display: none;
            }

            &:first-child ul {
                margin-bottom: 0;

                li:last-child {
                    margin-bottom: 0;
                }
            }
        }
    }

    .exchange-logos {
        overflow-x: auto;
        padding: 0 1rem 2rem;
        margin-bottom: -1rem;

        a {
            opacity: 1;
            filter: none;
        }

        a + a {
            margin-left: 2rem;
        }

        a:last-child {
            padding-right: 1rem;
        }
    }
}
</style>
