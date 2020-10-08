<template>
    <Modal class="trade-modal">
        <PageBody class="flex-column">
            <div class="exchange-area flex-column">
                <header>
                    <h1 class="nq-h1">{{ $t('Get NIM and BTC') }}</h1>
                    <!-- eslint-disable-next-line max-len -->
                    <i18n :path="'There are many options, use a credit card or trade\u00a0crypto. You can find more exchanges on {link}'"
                        tag="p" class="nq-text intro"
                    >
                        <template v-slot:link>
                            <a href="https://nimiq.com/exchanges" class="nq-link" target="_blank">
                                nimiq.com/exchanges
                            </a>
                        </template>
                    </i18n>
                </header>
                <div class="featured-exchanges flex-row">
                    <div class="exchange kucoin flex-column">
                        <h2 class="nq-h1 flex-row">
                            <img src="../../assets/exchanges/kucoin.svg">
                            KuCoin
                            <a class="nq-button-pill light-blue flex-row"
                                href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" target="_blank"
                                @mousedown.prevent
                            >{{ $t('Get NIM') }}<ArrowRightSmallIcon/></a>
                        </h2>
                        <ul>
                            <li>{{ $t('24/7 Chat & Phone\u00a0Support') }}</li>
                            <li>{{ $t('Android and iOS App') }}</li>
                        </ul>
                        <div class="flex-grow"></div>
                        <a class="nq-button-pill light-blue flex-row"
                            href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" target="_blank"
                            @mousedown.prevent
                        >{{ $t('To {exchange}', {exchange: 'KuCoin'}) }}<ArrowRightSmallIcon/></a>
                    </div>
                    <div class="separator"></div>
                    <div class="exchange changehero flex-column">
                        <h2 class="nq-h1 flex-row">
                            <img src="../../assets/exchanges/changehero.svg">
                            ChangeHero
                            <a class="nq-button-pill light-blue flex-row"
                                href="https://changehero.io/?to=nim" target="_blank"
                                @mousedown.prevent
                            >{{ $t('Get NIM') }}<ArrowRightSmallIcon/></a>
                        </h2>
                        <ul>
                            <li>{{ $t('For beginners') }}</li>
                            <li>{{ $t('Credit Card accepted') }}</li>
                        </ul>
                        <div class="flex-grow"></div>
                        <a class="nq-button-pill light-blue flex-row"
                            href="https://changehero.io/?to=nim" target="_blank"
                            @mousedown.prevent
                        >{{ $t('To {exchange}', {exchange: 'ChangeHero'}) }}<ArrowRightSmallIcon/></a>
                    </div>
                </div>
                <div class="exchange-logos flex-row">
                    <a href="https://www.kucoin.com/trade/NIM-BTC?rcode=y38f6N" title="KuCoin" target="_blank">
                        <img src="../../assets/exchanges/kucoin.svg">
                    </a>
                    <a href="https://hitbtc.com/NIM-to-BTC" title="HitBTC" target="_blank">
                        <img src="../../assets/exchanges/hitbtc.svg">
                    </a>
                    <a href="https://changelly.com/exchange/btc/nim?ref_id=v06xmpbqj5lpftuj"
                        title="Changelly" target="_blank"
                    ><img src="../../assets/exchanges/changelly.svg">
                    </a>
                    <a href="https://www.bitladon.com/nimiq?r=100038211" title="Bitladon" target="_blank">
                        <img src="../../assets/exchanges/bitladon.svg">
                    </a>
                    <a href="https://changehero.io/?to=nim" title="Changehero" target="_blank">
                        <img src="../../assets/exchanges/changehero.svg">
                    </a>
                    <a href="https://btc-alpha.com/coin/NIM/" title="BTC-Alpha" target="_blank">
                        <img src="../../assets/exchanges/btcalpha.svg">
                    </a>
                    <a href="https://coinswitch.co/?to=nim&ref=7OTBVXHK23" title="Coinswitch" target="_blank">
                        <img src="../../assets/exchanges/coinswitch.svg">
                    </a>
                    <a href="https://coindcx.com/trade/NIMBTC" title="CoinDCX" target="_blank">
                        <img src="../../assets/exchanges/coindcx.svg">
                    </a>
                    <a href="https://swapzone.io/?to=nim" title="Swapzone" target="_blank">
                        <img src="../../assets/exchanges/swapzone.svg">
                    </a>
                    <a href="https://swapspace.co/?to=nim" title="SwapSpace" target="_blank">
                        <img src="../../assets/exchanges/swapspace.svg">
                    </a>
                    <a href="https://www.coinspot.com.au/buy/nim" title="CoinSpot" target="_blank">
                        <img src="../../assets/exchanges/coinspot.svg">
                    </a>
                </div>
            </div>
            <div class="oasis-area nq-blue-bg flex-column">
                <label>{{ $t('Coming\u00a0soon') }}</label>
                <h2 class="nq-h2">{{ $t('Buy and sell with your wallet.') }}</h2>
                <p class="nq-text">
                    {{ $t('Nimiq OASIS enables decentra&shy;lized buying and selling of crypto directly from your '
                        + 'wallet.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Starting with EU\u00a0bank\u00a0accounts soon.') }}
                </p>
                <footer>
                    <BlueLink href="https://nimiq.com/oasis" target="_blank">{{ $t('Learn more') }}</BlueLink>
                    <!-- <div class="flex-grow"></div> -->
                    <div>
                        <p class="nq-text">{{ $t('In cooperation with') }}</p>
                        <img src="../../assets/ten31.svg" alt="TEN31">
                    </div>
                </footer>
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, ArrowRightSmallIcon } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import BlueLink from '../BlueLink.vue';

export default defineComponent({
    name: 'trade-modal',
    components: {
        Modal,
        PageBody,
        ArrowRightSmallIcon,
        BlueLink,
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    width: 88.5rem !important;
    height: 60rem !important;
    max-width: 100vw;
}

.page-body {
    padding: 0.75rem;
    flex-direction: row-reverse;
}

.exchange-area {
    flex-grow: 1;
    margin-left: 1.25rem;
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

.oasis-area {
    width: 22.75rem;
    border-radius: 0.625rem;
    padding: 3rem;
    flex-shrink: 0;
    align-items: flex-start;
    position: relative;

    label {
        text-transform: uppercase;
        font-size: var(--small-label-size);
        font-weight: bold;
        letter-spacing: 0.06em;
        padding: 0.625rem 1.5rem;
        color: rgba(255, 255, 255, 0.6);
        box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.2);
        border-radius: 50px;
    }

    h2 {
        font-weight: 600;
        margin-bottom: 2rem;
    }

    .nq-text,
    .nq-link {
        font-size: var(--small-size);
        font-weight: 600;
        margin-top: 0;
        line-height: 1.4;
    }

    > .nq-text:first-of-type {
        margin-bottom: 1.5rem;
    }

    .blue-link {
        font-weight: bold;
        color: var(--nimiq-light-blue);
    }

    footer {
        width: 100%;
        display: flex;
        flex-direction: column;
        flex-grow: 1;

        & > div:last-child {
            margin-top: auto;
        }

        .nq-text {
            margin-bottom: 1rem;
            opacity: calc(0.5 / 0.7);
            font-size: 1.5rem;
        }
    }

    img {
        display: block;
        opacity: 0.5;
    }

    &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: url('../../assets/oasis-bg-desktop.svg') bottom right no-repeat;
        pointer-events: none;
        user-select: none;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .modal /deep/ .small-page {
        // Regular Modal size (iOS scrolling inside the TradeModal does not work without a fixed height)
        height: unset !important;
    }

    .page-body {
        flex-direction: column;
        mask: linear-gradient(0deg , white, white calc(100% - 3.75rem), rgba(255,255,255, 0) calc(100% - 0.75rem));
    }

    .exchange-area {
        flex-shrink: 0;
        margin-left: 0;
        padding: 2.25rem 1.25rem;
        align-items: stretch;

        .intro {
            max-width: unset;
            margin-bottom: 5rem;
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
        display: none;
    }

    .oasis-area {
        width: unset;

        footer {
            align-items: flex-start;
            flex-direction: row;
            flex-wrap: wrap;
            flex-grow: 0;

            .nq-link,
            & > div:last-child {
                flex: 0 0 auto;
            }

            & > div:last-child {
                display: flex;
                flex: 0 0 auto;
                margin-left: auto;
                margin-top: 0;

                .nq-text {
                    margin-bottom: 0;
                    margin-right: 1rem;
                }
            }

        }

        &::after {
            background: url('../../assets/oasis-bg-mobile.svg') bottom right no-repeat;
        }
    }
}
</style>
