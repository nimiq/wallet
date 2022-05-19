<template>
    <div class="sidebar padding flex-column">
        <div v-if="isTestnet" class="testnet-notice flex-row">
            <StreetconeIcon/>
            <span class="nq-label">{{ $t('Devnet') }}</span>
            <div class="flex-grow"></div>
            <Tooltip preferredPosition="bottom left"
                :container="$parent"
                theme="inverse"
                :styles="{ transform: 'translate(0.5rem, 2rem)' }"
                ref="testnetTooltip"
            >
                <template #trigger>
                    <InfoCircleIcon/>
                </template>
                <template #default>
                    <p>{{ $t('You are connecting to the Nimiq, Bitcoin, Polygon (USDC) Testnets,\
                        and Nimiq Albatross Devnet.') }}</p>
                    <p>{{ $t('Please do not use your Mainnet accounts!') }}</p>
                </template>
            </Tooltip>
        </div>


        <header class="logo" @click="resetState">
            <span class="nq-icon nimiq-logo"></span>
            <span class="logo-wordmark">Nimiq</span>
        </header>

        <AnnouncementBox/>

        <div v-if="windowHeight >= 520" class="price-chart-wrapper">
            <PriceChart currency="nim" @timespan="switchPriceChartTimeRange" :timeRange="priceChartTimeRange"/>
            <PriceChart v-if="$config.enableBitcoin"
                currency="btc" :showTimespanLabel="false" :timeRange="priceChartTimeRange"/>
        </div>

        <div class="trade-actions" v-if="!isLegacyAccount">
            <Tooltip v-if="$config.fastspot.enabled || $config.moonpay.enabled || $config.simplex.enabled"
                preferredPosition="top right"
                :container="$parent"
                theme="inverse"
                :styles="{ minWidth: '25rem' }"
                :disabled="!hasActiveSwap"
                ref="buyTooltip"
            >
                <template #trigger>
                    <button
                        class="nq-button-s inverse"
                        :disabled="hasActiveSwap"
                        @click="openModal('buy')"
                        @mousedown.prevent="hideTooltips"
                    >{{ $t('Buy') }}</button>
                </template>
                <template #default>{{
                    $t('Please wait for your current swap to finish before starting a new one.')
                }}</template>
            </Tooltip>

            <Tooltip v-if="$config.fastspot.enabled"
                preferredPosition="top right"
                :container="$parent"
                theme="inverse"
                :styles="{ minWidth: '25rem' }"
                :disabled="!$config.oasis.underMaintenance && canUseSwaps && !hasActiveSwap"
                ref="sellTooltip"
            >
                <template #trigger>
                    <button class="nq-button-s inverse"
                        :disabled="$config.oasis.underMaintenance || !canUseSwaps || hasActiveSwap"
                        @click="openModal('sell-crypto')"
                        @mousedown.prevent="hideTooltips"
                    >{{ $t('Sell') }}</button>
                </template>
                <template v-if="$config.oasis.underMaintenance" #default>
                    {{ $t('OASIS’ TEN31 Bank infrastructure is currently being updated.'
                        + ' This might take some time. Please try again later.') }}
                    <br>
                    <a href="https://forum.nimiq.community/t/oasis-infrastructure-update/1810"
                        target="_blank" rel="noopener"
                        class="nq-blue"
                    >{{ $t('Learn more.') }}</a>
                </template>
                <template v-else-if="!canUseSwaps" #default>{{
                    /* Re-using existing, translated strings already used by BuyOptionsModal */
                    $t('Not available in your browser') + '. '
                    + $t('Your browser does not support Keyguard popups, or they are disabled in the Settings.')
                }}</template>
                <template v-else-if="hasActiveSwap" #default>{{
                    $t('Please wait for your current swap to finish before starting a new one.')
                }}</template>
            </Tooltip>
        </div>

        <div v-if="windowHeight >= 450 && !isLegacyAccount" class="balance-distribution-wrapper">
            <BalanceDistribution />
        </div>

        <Tooltip v-if="$config.fastspot.enabled && !isLegacyAccount"
            preferredPosition="bottom right"
            :container="$parent"
            :disabled="activatedCurrencies.length > 1 && hasBalance && canUseSwaps && !hasActiveSwap"
            theme="inverse"
            class="swap-tooltip"
            :styles="{ minWidth: '25rem' }"
            ref="swapTooltip"
        >
            <template #trigger>
                <button
                    :disabled="activatedCurrencies.length <= 1 || !hasBalance || !canUseSwaps || hasActiveSwap"
                    class="nq-button-s inverse"
                    @click="openModal('swap')"
                    @mousedown.prevent="hideTooltips"
                >{{ $t('Swap') }}</button>
            </template>
            <template v-if="activatedCurrencies.length <= 1" #default>{{
                $t('Please activate BTC or USDC in your account first to be able to swap to these currencies.')
            }}</template>
            <template v-else-if="!hasBalance" #default>{{ $t('You currently have no balance to swap.') }}</template>
            <template v-else-if="!canUseSwaps" #default>{{
                /* Re-using existing, translated strings already used by BuyOptionsModal */
                $t('Not available in your browser') + '. '
                + $t('Your browser does not support Keyguard popups, or they are disabled in the Settings.')
            }}</template>
            <template v-else-if="hasActiveSwap" #default>{{
                $t('Please wait for your current swap to finish before starting a new one.')
            }}</template>
        </Tooltip>

        <div class="flex-grow"></div>

        <AccountMenu
            :class="{'active': $route.name === 'root'}"
            @click="navigateTo('/')"/>

        <button
            class="network reset flex-row"
            :class="{'active': $route.name === 'network'}"
            @click="navigateTo('/network')"
        >
            <ConsensusIcon/>
            <span class="label">{{ $t('Network') }}</span>
        </button>
        <button
            class="settings reset flex-row"
            :class="{'active': $route.name === 'settings'}"
            @click="navigateTo('/settings')"
        >
            <GearIcon/>
            <span class="label">{{ $t('Settings') }}</span>
            <AttentionDot v-if="updateAvailable"/>
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from '@vue/composition-api';
import { GearIcon, Tooltip, InfoCircleIcon } from '@nimiq/vue-components';
import AnnouncementBox from '../AnnouncementBox.vue';
import AccountMenu from '../AccountMenu.vue';
import PriceChart, { TimeRange } from '../PriceChart.vue';
import BalanceDistribution from '../BalanceDistribution.vue';
import ConsensusIcon from '../ConsensusIcon.vue';
import StreetconeIcon from '../icons/StreetconeIcon.vue';
import AttentionDot from '../AttentionDot.vue';

import { useAddressStore } from '../../stores/Address';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { useSettingsStore } from '../../stores/Settings';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useSwapsStore } from '../../stores/Swaps';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';
import { ENV_TEST, ENV_DEV, CryptoCurrency } from '../../lib/Constants';

export default defineComponent({
    setup(props, context) {
        const { config } = useConfig();
        const { isMobile, height: windowHeight } = useWindowSize();

        async function navigateTo(path: string) {
            if (isMobile.value) {
                return context.root.$router.replace(path);
            }
            return context.root.$router.push(path).catch(() => { /* ignore */ });
        }

        async function openModal(routeName: string) {
            // Each modal is expected to be sitting above a specific parent route / background page. If we're not
            // currently on that route, navigate to it first, such that the modal can be closed later by a simple back
            // navigation leading to that parent route. If we wouldn't do that, a back navigation would lead back to our
            // current route, but with the modal still open on top.
            const modalRoute = context.root.$router.resolve({ name: routeName }).route;
            const expectedParentRoute = modalRoute.matched.find(({ name }) => !!name && name !== routeName);
            if (expectedParentRoute && context.root.$route.name !== expectedParentRoute.name) {
                // Don't keep the sidebar open for this navigation on mobile because closing it would be a back
                // navigation on the parent page, leading back to the route we're currently on, instead of closing the
                // sidebar.
                await navigateTo(expectedParentRoute.path);
            }
            return context.root.$router.push({
                name: routeName,
                query: { sidebar: 'true' }, // on mobile keep sidebar open in background
            }).catch(() => { /* ignore */ });
        }

        // Note: config.environment should never change at runtime.
        const isTestnet = config.environment === ENV_TEST || config.environment === ENV_DEV;
        const isDev = config.environment === ENV_DEV;

        const priceChartTimeRange = ref(TimeRange['24h']);
        function switchPriceChartTimeRange() {
            if (priceChartTimeRange.value === TimeRange['24h']) {
                priceChartTimeRange.value = TimeRange['7d'];
            } else {
                priceChartTimeRange.value = TimeRange['24h'];
            }
        }

        const { addressInfos, selectAddress } = useAddressStore();
        function resetState() {
            navigateTo('/');

            if (addressInfos.value.length > 0) {
                selectAddress(addressInfos.value[0].address);
            }
        }

        const { updateAvailable, canUseSwaps } = useSettingsStore();

        const { activeAccountInfo, hasBitcoinAddresses, hasUsdcAddresses } = useAccountStore();
        const isLegacyAccount = computed(() => activeAccountInfo.value?.type === AccountType.LEGACY);

        const activatedCurrencies = computed(() => [
            CryptoCurrency.NIM, // NIM is always activated
            ...(config.enableBitcoin && hasBitcoinAddresses.value ? [CryptoCurrency.BTC] : []),
            ...(config.usdc.enabled && hasUsdcAddresses.value ? [CryptoCurrency.USDC] : []),
        ]);

        const hasBalance = computed(() => [useAddressStore, useBtcAddressStore, useUsdcAddressStore].some((useStore) =>
            !!useStore().accountBalance.value,
        ));

        const { activeSwap } = useSwapsStore();
        const hasActiveSwap = computed(() => activeSwap.value !== null);

        // The Sidebar's buttons have mousedown.prevent to circumvent focus issues on iOS. As this also causes focused
        // tooltips to not lose focus and close if such a button is clicked, we close them manually.
        function hideTooltips() {
            for (const refComponent of Object.values(context.refs)) {
                if (!(refComponent instanceof Tooltip)) continue;
                refComponent.hide();
            }
        }

        return {
            navigateTo,
            resetState,
            isTestnet,
            isDev,
            windowHeight,
            priceChartTimeRange,
            switchPriceChartTimeRange,
            isLegacyAccount,
            activatedCurrencies,
            hasBalance,
            hasActiveSwap,
            canUseSwaps,
            updateAvailable,
            hideTooltips,
            openModal,
        };
    },
    components: {
        AnnouncementBox,
        GearIcon,
        PriceChart,
        BalanceDistribution,
        AccountMenu,
        ConsensusIcon,
        Tooltip,
        InfoCircleIcon,
        StreetconeIcon,
        AttentionDot,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
// Breakpoints at which the price charts and balance distribution are shown via v-if. We use v-if and not display: none
// to avoid unnecessarily mounting and updating them while they're not displayed.
$price-chart-display-breakpoint: 520px;
$balance-distribution-display-breakpoint: 450px;

.sidebar {
    @include flex-full-height;
    align-items: center;
    background: var(--bg-secondary);
    color: white;

    /* Default: 1440px */
    --padding-top: 2.75rem;
    --padding-sides: 1.5rem;
    --padding-bottom: 2rem;

    padding: var(--padding-top) var(--padding-sides) var(--padding-bottom);
    padding-bottom: max(var(--padding-bottom), env(safe-area-inset-bottom));
}

.testnet-notice {
    align-items: center;
    width: calc(100% + calc(2 * var(--padding-sides)));
    margin: calc(-1 * var(--padding-top)) calc(-1 * var(--padding-sides)) var(--padding-top);
    padding: var(--padding-sides);
    background: rgba(255, 255, 255, .07);

    .nq-label {
        font-size: var(--small-label-size);
        color: var(--nimiq-orange);
        margin: 0 0 0 1rem;
    }

    .nq-icon {
        color: rgba(255, 255, 255, .5);
        font-size: 1.75rem;
        stroke-width: 1.5px;
    }

    p {
        margin: 0;
        font-size: var(--small-size);
        font-weight: 600;
        line-height: 1.4;

        & + p {
            margin-top: 1rem;
        }
    }

    .tooltip {
        ::v-deep .trigger {
            display: block;
        }

        ::v-deep .tooltip-box {
            width: 20.5rem;
            padding: 1.25rem 1.5rem;
        }
    }
}

> * {
    margin: 1rem 0;
}

.logo {
    color: white;
    align-self: flex-start;
    margin-left: 1.5rem;
    margin-bottom: 1rem;
    cursor: pointer;
}

.announcement-box {
    margin-bottom: 2.5rem;
    margin-top: 2rem;
    align-self: stretch;
}

.price-chart-wrapper,
.balance-distribution-wrapper {
    overflow-y: auto;
    width: 100%;
    scrollbar-width: none;

    mask: linear-gradient(0deg,
        rgba(255,255,255, 0),
        white 3rem,
        white calc(100% - 3rem),
        rgba(255,255,255, 0)
    );

    &::-webkit-scrollbar {
        width: 0;
    }
}

.price-chart {
    height: 15rem;
    width: 100%;
    padding: 1.5rem;

    &:first-child {
        margin-top: 1.25rem;
    }

    &:last-child {
        margin-bottom: .75rem;
    }

    ::v-deep .timespan {
        left: 1.5rem;
        top: 1.5rem;
    }
}

.trade-actions,
.swap-tooltip {
    align-self: stretch; // wider than in the designs to better accommodate long translations

    ::v-deep .trigger,
    ::v-deep .trigger .nq-button-s {
        width: 100%;
    }

    .nq-button-s {
        height: 3.25rem;
        background: rgba(255, 255, 255, .1);

        &:active,
        &:focus,
        &:hover {
            background: rgba(255, 255, 255, .2);
        }
        &:disabled {
            pointer-events: none;
        }
    }
}

.trade-actions {
    margin-bottom: 1.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;

    > * {
        flex-grow: 1; // make buttons span available space and full width if they break into two lines
    }

    @media (max-height: $price-chart-display-breakpoint - 1px) {
        margin-top: 2rem;
        margin-bottom: .5rem;
    }
    @media (max-height: $balance-distribution-display-breakpoint - 1px) {
        margin-bottom: 2rem;
    }
}

.balance-distribution-wrapper {
    flex-shrink: 0; // when price-chart-wrapper is visible, shrink that one instead

    @media (max-height: $price-chart-display-breakpoint - 1px) {
        flex-shrink: 1;
    }
}

.balance-distribution {
    margin: 2.5rem 0;
}

.swap-tooltip {
    margin-bottom: 4rem;
}

.account-menu,
.settings,
.network {
    margin: 0 0.5rem;
    align-self: stretch;
    flex-shrink: 0;
    position: relative;
}

.settings,
.network {
    align-items: center;
    color: rgba(255, 255, 255, .3);
    margin-top: 1rem;
    padding: 1.75rem 1.25rem;
    font-size: 2.5rem;
    font-weight: 600;
    border-radius: 0.5rem;

    transition:
        background 0.2s var(--nimiq-ease),
        color 0.2s var(--nimiq-ease);

    > :first-child {
        flex-shrink: 0;
    }

    .label {
        margin-left: 2rem;
        color: rgba(255, 255, 255, .7);
        font-size: 2rem;

        transition: color 0.2s var(--nimiq-ease);
    }

    &:hover,
    &:focus,
    &.active {
        background: rgba(255, 255, 255, .1);
        color: rgba(255, 255, 255, .5);

        .label {
            color: rgba(255, 255, 255, 1);
        }
    }

    &.active {
        cursor: auto;
    }
}

.attention-dot {
    position: absolute;
    top: 1.25rem;
    left: 3.5rem;
}

.network {
    .consensus-icon {
        color: white;
        opacity: 0.3;

        transition: color 0.2s var(--nimiq-ease), opacity 0.2s var(--nimiq-ease);
    }

    &:hover .consensus-icon,
    &:focus .consensus-icon,
    &.active .consensus-icon {
        opacity: 0.5;
    }
}
</style>
