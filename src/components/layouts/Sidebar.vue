<template>
    <div class="sidebar padding flex-column" ref="sidebar">
        <div v-if="isTestnet" class="testnet-notice flex-row">
            <StreetconeIcon/>
            <span class="nq-label">{{ $t('Testnet') }}</span>
            <div class="flex-grow"></div>
            <Tooltip preferredPosition="bottom left" theme="inverse" :styles="{transform: 'translate(0.5rem, 2rem)'}">
                <InfoCircleIcon slot="trigger"/>
                <p>{{ $t('You are connecting to the Nimiq Testnet.') }}</p>
                <p>{{ $t('Please do not use your Mainnet accounts!') }}</p>
            </Tooltip>
        </div>

        <header class="logo">
            <span class="nq-icon nimiq-logo"></span>
            <span class="logo-wordmark">Nimiq</span>
        </header>

        <AnnouncementBox/>

        <div class="price-chart-wrapper">
            <PriceChart currency="nim" @timespan="switchPriceChartTimeRange" :timeRange="priceChartTimeRange"/>
            <PriceChart currency="btc" :showTimespanLabel="false" :timeRange="priceChartTimeRange"/>
        </div>

        <div class="trade-actions">
            <button class="nq-button-s inverse"
                @click="$router.push('/trade?sidebar=true')"
                :disabled="$route.name !== 'root'"
            >{{ $t('Buy & Sell') }}</button>
        </div>

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
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { GearIcon, Tooltip, InfoCircleIcon } from '@nimiq/vue-components';

import Config from 'config';

import AnnouncementBox from '../AnnouncementBox.vue';
import AccountMenu from '../AccountMenu.vue';
import PriceChart, { TimeRange } from '../PriceChart.vue';
import ConsensusIcon from '../ConsensusIcon.vue';
import StreetconeIcon from '../icons/StreetconeIcon.vue';

import { useWindowSize } from '../../composables/useWindowSize';
import { ENV_TEST, ENV_DEV } from '../../lib/Constants';

export default defineComponent({
    name: 'sidebar',
    setup(props, context) {
        const { width } = useWindowSize();

        function navigateTo(path: string) {
            if (width.value <= 700) { // Full mobile breakpoint
                context.root.$router.replace(path);
            } else {
                context.root.$router.push(path).catch(() => { /* ignore */ });
            }
        }

        const isTestnet = Config.environment === ENV_TEST || Config.environment === ENV_DEV;

        const priceChartTimeRange = ref(TimeRange['24h']);
        function switchPriceChartTimeRange() {
            if (priceChartTimeRange.value === TimeRange['24h']) {
                priceChartTimeRange.value = TimeRange['7d'];
            } else {
                priceChartTimeRange.value = TimeRange['24h'];
            }
        }

        return {
            navigateTo,
            isTestnet,
            priceChartTimeRange,
            switchPriceChartTimeRange,
        };
    },
    components: {
        AnnouncementBox,
        GearIcon,
        PriceChart,
        AccountMenu,
        ConsensusIcon,
        Tooltip,
        InfoCircleIcon,
        StreetconeIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.sidebar {
    @include flex-full-height;
    align-items: center;
    background: var(--bg-secondary);
    color: white;

    /* Default: 1440px */
    --padding-top: 3rem;
    --padding-sides: 1.5rem;
    --padding-bottom: 2rem;

    padding: var(--padding-top) var(--padding-sides) var(--padding-bottom);
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
        line-height: 1.3;

        & + p {
            margin-top: 1rem;
        }
    }

    .tooltip {
        /deep/ .trigger {
            display: block;
        }

        /deep/ .tooltip-box {
            width: 20rem;
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
}

.announcement-box {
    margin-bottom: 2.5rem;
    margin-top: 2rem;
    align-self: stretch;
}

.price-chart-wrapper {
    overflow-y: auto;
    width: 100%;
    min-height: 10rem;

    mask: linear-gradient(0deg ,
        rgba(255,255,255, 0),
        white 3rem,
        white calc(100% - 3rem),
        rgba(255,255,255, 0)
    );

    .price-chart:first-child {
        margin-top: 1rem;
    }

    .price-chart:last-child {
        margin-bottom: 1rem;
    }

    &::-webkit-scrollbar {
        width: 0px;
    }
}

.price-chart {
    height: 15rem;
    width: 100%;
    padding: 1.5rem;

    /deep/ .timespan {
        left: 1.5rem;
        top: 1.5rem;
    }
}

.trade-actions {
    flex-grow: 1;
    margin-bottom: 2rem;
}

.trade-actions .nq-button-s {
    margin: 0.5rem 1rem 1rem;
    background: rgba(255, 255, 255, .1);

    &:active,
    &:focus,
    &:hover {
        background: rgba(255, 255, 255, .2);
    }
}

.account-menu,
.settings,
.network {
    margin: 0 0.5rem;
    align-self: stretch;
    flex-shrink: 0;
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
