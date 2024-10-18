<template>
    <div class="network nq-blue-bg">
        <div class="menu-bar full-width flex-row">
            <button class="reset menu-button"
                @click="$router.push({ name: 'network', query: { sidebar: !router.currentRoute.query.sidebar } })">
                <MenuIcon/>
                <AttentionDot v-if="updateAvailable"/>
            </button>
            <button
                class="nq-button-s inverse account-button"
                @click="$router.push('/').catch(() => {})"
                @mousedown.prevent
            >
                {{ $t('Back to addresses') }}
            </button>
            <button class="reset info-button" @click="showNetworkInfo = true">
                <InfoCircleIcon/>
            </button>
        </div>

        <section class="nimiq-network full-width scroller">
            <NetworkStats>
                <template #network>NIM</template>
                <template #network-info>
                    <button class="reset info-button" @click="showNetworkInfo = true"><InfoCircleIcon/></button>
                </template>
                <template #consensus>{{ consensusState }}</template>
                <template #peerCount>{{ $tc('{count} Peer | {count} Peers', peerCount) }}</template>
                <template #fee>
                    <i18n tag="span" path="{amount}/tx">
                        <template #amount>
                            <FiatConvertedAmount :amount="0" :currency="CryptoCurrency.NIM" roundDown/>
                        </template>
                    </i18n>
                </template>
                <template #txTime>{{ $t('1 min') }}</template>
            </NetworkStats>
            <div class="map flex-column" ref="map$">
                <NetworkMap @own-x-coordinate="scrollMap"/>
            </div>
        </section>

        <section v-if="$config.enableBitcoin" :class="{'full-width': !$config.polygon.enabled}">
            <NetworkStats>
                <template #network>BTC</template>
                <template v-if="btcFee" #fee>
                    <i18n tag="span" path="{amount}/tx">
                        <template #amount>
                            <FiatConvertedAmount :amount="btcFee" :currency="CryptoCurrency.BTC"/>
                        </template>
                    </i18n>
                </template>
                <template v-else #fee><CircleSpinner /></template>
                <template #txTime>{{ $t('10 min') }}</template>
            </NetworkStats>
        </section>

        <section v-if="$config.polygon.enabled" :class="{'full-width': !$config.enableBitcoin}">
            <NetworkStats>
                <template #network>USDC</template>
                <template v-if="usdcFee" #fee>
                    <i18n tag="span" path="{amount}/tx">
                        <template #amount>
                            <FiatConvertedAmount :amount="usdcFee" :currency="CryptoCurrency.USDC"/>
                        </template>
                    </i18n>
                </template>
                <template v-else #fee><CircleSpinner /></template>
                <template #txTime>{{ $t('20 sec') }}</template>
            </NetworkStats>
        </section>

        <transition name="modal">
            <NetworkInfoModal v-if="showNetworkInfo" emitClose @close="onNetworkInfoClosed"/>
        </transition>

        <Portal>
            <transition name="modal">
                <router-view name="modal"/>
            </transition>
        </Portal>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed } from '@vue/composition-api';
import { InfoCircleIcon, CircleSpinner } from '@nimiq/vue-components';
import { calculateFee as calculateUsdcFee } from '@/ethers';
import { estimateFees } from '@/lib/BitcoinTransactionUtils';
import { getElectrumClient } from '@/electrum';
// @ts-expect-error missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';
import { useSettingsStore } from '../../stores/Settings';
import { useNetworkStore } from '../../stores/Network';
import { useConfig } from '../../composables/useConfig';
import { CryptoCurrency } from '../../lib/Constants';
import { WIDTH } from '../../lib/NetworkMap';
import NetworkMap from '../NetworkMap.vue';
import NetworkStats from '../NetworkStats.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import NetworkInfoModal from '../modals/NetworkInfoModal.vue';
import AttentionDot from '../AttentionDot.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import router from '../../router';

const LOCALSTORAGE_KEY = 'network-info-dismissed';

export default defineComponent({
    setup(props, context) {
        const { state: $network } = useNetworkStore();
        const { config } = useConfig();

        const peerCount = computed(() => $network.peerCount);
        const consensusState = computed(() => {
            switch ($network.consensus as 'lost' | 'syncing' | 'connecting' | 'established') {
                case 'lost': return context.root.$t('lost');
                case 'syncing': return context.root.$t('syncing');
                case 'connecting': return context.root.$t('connecting');
                case 'established': return context.root.$t('established');
                default: return 'Unknown'; // should never happen
            }
        });

        const showNetworkInfo = ref(!window.localStorage.getItem(LOCALSTORAGE_KEY));

        function onNetworkInfoClosed() {
            window.localStorage.setItem(LOCALSTORAGE_KEY, '1');
            showNetworkInfo.value = false;
        }

        const map$ = ref<HTMLDivElement>(null);
        function scrollMap(x: number) {
            const mapWidth = map$.value!.children[0]!.clientWidth;
            const adjustedX = x * (mapWidth / WIDTH);

            const scrollTarget = adjustedX - (window.innerWidth / 2);
            map$.value!.scrollTo(scrollTarget, 0);
        }

        const { updateAvailable } = useSettingsStore();

        const btcFee = ref(0);
        const usdcFee = ref(0);

        // we are going to set up a timer to update the fees every minute
        let interval: number;

        onMounted(() => {
            setFees();
            if (config.enableBitcoin || config.polygon.enabled) {
                interval = window.setInterval(setFees, 60 * 1000); // every minute
            }
        });
        onUnmounted(() => {
            if (interval) {
                window.clearInterval(interval);
            }
        });

        async function setFees() {
            if (config.enableBitcoin) {
                const client = await getElectrumClient();
                await client.waitForConsensusEstablished();
                const fees = await client.estimateFees([/* blocks */12]);
                btcFee.value = estimateFees(2, 2, fees[12]);
            }

            if (config.polygon.enabled) {
                usdcFee.value = (await calculateUsdcFee(
                    config.polygon.usdc.tokenContract,
                    'transferWithPermit',
                )).fee.toNumber();
            }
        }

        return {
            CryptoCurrency,
            showNetworkInfo,
            onNetworkInfoClosed,
            map$,
            scrollMap,
            updateAvailable,
            peerCount,
            consensusState,
            btcFee,
            usdcFee,
            router,
        };
    },
    components: {
        NetworkMap,
        NetworkStats,
        MenuIcon,
        InfoCircleIcon,
        NetworkInfoModal,
        AttentionDot,
        Portal,
        CircleSpinner,
        FiatConvertedAmount,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

.network {
    background: var(--nimiq-blue);
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
    padding: 1rem;
    padding-left: 0.5rem;

    @media screen and (min-width: $halfMobileBreakpoint) {
        grid-template-rows: 1fr auto;
    }

    & ::v-deep .page-body {
        overflow: hidden;
    }

    .full-width {
        grid-column-end: span 2;
    }
}

.menu-bar {
    padding: 2rem;
    justify-content: space-between;
    align-items: center;
    z-index: 1;
    position: unset;

    button.reset {
        font-size: 2.5rem;
    }

    .menu-button,
    .account-button {
        display: block;
    }

    .menu-button {
        width: 3.5rem;
        height: 2.75rem;
        box-sizing: content-box;
        position: relative;

        .attention-dot {
            position: absolute;
            top: 0;
            right: 0;
            border: 0.375rem solid #171b3c;
        }
    }

    .nq-button-s {
        opacity: 0.7;
    }

    @media screen and (min-width: $halfMobileBreakpoint) {
        display: none;
    }
}

.info-button {
    font-size: 3rem;
    transition: opacity 0.3s var(--nimiq-ease);
    z-index: 1;

    svg {
        opacity: 0.3;
    }

    &:hover,
    &:focus {
        opacity: 0.5;
    }
}

@media screen and (max-width: $halfMobileBreakpoint) {
    .nimiq-network button.reset.info-button {
        display: none;
    }
}

section {
    position: relative;
    background: rgba(5, 8, 31, 0.5);
    padding: 2rem;
    border-radius: 1rem;

    &.nimiq-network {
        display: flex;

        @media screen and (max-width: $mobileBreakpoint) {
            padding-left: 0;

            & ::v-deep .network-stats {
                position: sticky;
                left: 0;
                top: 2rem;
                padding-left: 2rem;
                padding-right: 7rem;
                background: linear-gradient(90deg, #121533 60.75%, rgba(18, 21, 51, 0) 100%);
                z-index: 1;
            }
        }

        .map {
            width: 100%;
            flex-grow: 1;
            flex-shrink: 1;

            @media screen and (max-width: $mobileBreakpoint) {
                position: relative;
                left: -12rem;
            }
        }

        .network-map {
            flex-grow: 1;
            display: flex;
            width: 100%;

            @media screen and (max-width: $mobileBreakpoint) {
                // Take the screen height, subtract header padding top(16px), header (59px), row-gap header-map (8px),
                // row-gap map-btc/usdc stats (8px), btc/usdc height (160.85px), and multiply with the ratio between
                // network map width and height.
                --mapHeight: calc(100vh - 8px - 59px - 8px - 160.85px - 8px - 8px);
                width: calc(var(--mapHeight) * (1082 / 502));
            }
        }

        @media screen and (min-width: $mobileBreakpoint) {
            flex-direction: column;
        }

        .stats {
            flex-shrink: 0;
        }
    }

    .fiat-amount {
        margin-right: -.75rem;
    }

    ::v-deep .circle-spinner {
        path:first-child {
            stroke: white;
        }
        path:last-child {
            stroke: rgba(255, 255, 255, 0.6);
        }
    }
}

@media screen and (max-width: $mobileBreakpoint) {
    .scroller {
        width: 100%;
        flex-grow: 1;
        flex-shrink: 1;
        overflow-y: auto;
    }
}
</style>
