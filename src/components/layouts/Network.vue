<template>
    <div class="network nq-blue-bg">
        <div class="menu-bar flex-row">
            <button class="reset menu-button" @click="$router.push({name: 'network', query: {sidebar: true}})">
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

        <section class="nimiq-network scroller">
            <NetworkStats>
                <template slot="network">NIM</template>
                <template slot="network-info">
                    <button class="reset info-button" @click="showNetworkInfo = true"><InfoCircleIcon/></button>
                </template>
                <template slot="consensus">{{getConsensusStateString()}}</template>
                <template slot="peerCount">{{ $tc('{count} Peer | {count} Peers', $network.peerCount) }}</template>
                <template slot="fee">{{ $t('0€/tx') }}</template>
                <template slot="txTime">{{ $t('1 min') }}</template>
            </NetworkStats>
            <div class="map flex-column" ref="$map">
                <NetworkMap @own-x-coordinate="scrollMap"/>
            </div>
        </section>

        <section class="btc-network">
            <NetworkStats>
                <template slot="network">BTC</template>
                <template v-if="btcFeeFiat" slot="fee">
                    <i18n tag="span" path="{amount}/tx" class="fee">
                        <template #amount>
                            <FiatAmount :amount="btcFeeFiat" :hideDecimals="false" :currency="fiatCurrency"/>
                        </template>
                    </i18n>
                </template>
                <template v-else slot="fee"><CircleSpinner /></template>
                <template slot="txTime">{{ $t('10 min') }}</template>
            </NetworkStats>
        </section>

        <section class="polygon-network">
            <NetworkStats>
                <template slot="network">USDC</template>
                <template v-if="usdcFeeFiat" slot="fee">
                    <i18n tag="span" path="{amount}/tx" class="fee">
                        <template #amount>
                            <FiatAmount :amount="usdcFeeFiat" :hideDecimals="false" :currency="fiatCurrency"/>
                        </template>
                    </i18n>
                </template>
                <template v-else slot="fee"><CircleSpinner /></template>
                <template slot="txTime">{{ $t('20 sec') }}</template>
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
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { InfoCircleIcon, FiatAmount, CircleSpinner } from '@nimiq/vue-components';
import { calculateFee as calculateUsdcFee } from '@/ethers';
import { estimateFees } from '@/lib/BitcoinTransactionUtils';
import { getElectrumClient } from '@/electrum';
import { useFiatStore } from '@/stores/Fiat';
// @ts-expect-error missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';
import NetworkMap from '../NetworkMap.vue';
import NetworkStats from '../NetworkStats.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import NetworkInfoModal from '../modals/NetworkInfoModal.vue';
import AttentionDot from '../AttentionDot.vue';
import { WIDTH } from '../../lib/NetworkMap';
import { useSettingsStore } from '../../stores/Settings';
import { useNetworkStore } from '../../stores/Network';

const LOCALSTORAGE_KEY = 'network-info-dismissed';

export default defineComponent({
    setup(props, context) {
        const { state: $network } = useNetworkStore();

        function getConsensusStateString() {
            return {
                lost: context.root.$t('lost'),
                syncing: context.root.$t('syncing'),
                connecting: context.root.$t('connecting'),
                established: context.root.$t('established'),
            }[$network.consensus as 'lost' | 'syncing' | 'connecting' | 'established'];
        }

        const showNetworkInfo = ref(!window.localStorage.getItem(LOCALSTORAGE_KEY));

        function onNetworkInfoClosed() {
            window.localStorage.setItem(LOCALSTORAGE_KEY, '1');
            showNetworkInfo.value = false;
        }

        const $map = ref<HTMLDivElement | null>(null);
        function scrollMap(x: number) {
            const mapWidth = $map.value!.children[0]!.clientWidth;
            const adjustedX = x * (mapWidth / WIDTH);

            const scrollTarget = adjustedX - (window.innerWidth / 2);
            $map.value!.scrollTo(scrollTarget, 0);
        }

        const { updateAvailable } = useSettingsStore();

        const { currency: fiatCurrency, state: fiat$ } = useFiatStore();

        const btcExchangeRate = fiat$.exchangeRates.btc[fiat$.currency]!;
        const usdcExchangeRate = fiat$.exchangeRates.usdc[fiat$.currency]!;

        const usdcFeeFiat = ref(0);
        const btcFeeFiat = ref(0);

        onMounted(async () => {
            const client = await getElectrumClient();
            await client.waitForConsensusEstablished();
            const fees = await client.estimateFees([12]);
            btcFeeFiat.value = (estimateFees(2, 2, fees[12]) / 1e8) * btcExchangeRate;

            usdcFeeFiat.value = ((await calculateUsdcFee()).fee.toNumber() / 1e6) * usdcExchangeRate;
        });

        return {
            showNetworkInfo,
            onNetworkInfoClosed,
            $map,
            scrollMap,
            updateAvailable,
            $network,
            getConsensusStateString,
            btcFeeFiat,
            usdcFeeFiat,
            fiatCurrency,
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
        FiatAmount,
    },
});
</script>

<style lang="scss" scoped>
.network {
    background: var(--nimiq-blue);
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr auto;
    gap: 1rem;
    padding: 1rem;
    padding-left: 0.5rem;

    @media screen and (min-width: 1160px) {
        grid-template-rows: 1fr auto;
    }

    & ::v-deep .page-body {
        overflow: hidden;
    }
}

.menu-bar {
    grid-column: 1 / -1;
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

    @media screen and (min-width: 1160px) {
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

@media screen and (max-width: 1160px) {
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
        grid-column: 1 / -1;
        display: flex;
        --mapHeight: calc(100vh - 8px - 59px - 8px - 160.85px - 8px - 8px);

        @media screen and (max-width: 700px) {
            & ::v-deep .network-stats {
                position: fixed;
                background: linear-gradient(90deg, #121533 60.75%, rgba(18, 21, 51, 0) 100%);
                height: calc(var(--mapHeight) - 2rem);
                padding: 2rem;
                padding-right: 4rem;
                margin-left: -2rem;
                margin-top: -2rem;
                z-index: 1;
            }
        }

        .map {
            width: 100%;
            flex-grow: 1;
            flex-shrink: 1;
            flex: 1;

            @media screen and (max-width: 700px) {
                position: relative;
                left: -12rem;
            }
        }

        .network-map {
            flex-grow: 1;
            display: flex;
            width: 100%;

            @media screen and (max-width: 700px) {
                // Take the screen height, subtract header padding top(16px), header (59px), row-gap header-map (8px),
                // row-gap map-btc/usdc stats (8px), btc/usdc height (160.85px), and multiply with the ratio between
                // network map width and height.
                width: calc(var(--mapHeight) * (1082 / 502));
            }
        }

        @media screen and (min-width: 700px) {
            flex-direction: column;
        }

        .stats {
            flex-shrink: 0;
        }
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

@media screen and (max-width: 700px) {
    .scroller {
        width: 100%;
        flex-grow: 1;
        flex-shrink: 1;
        overflow-y: auto;
    }
}
</style>
