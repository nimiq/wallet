<template>
    <div class="sidebar padding flex-column">
        <header class="logo">
            <span class="nq-icon nimiq-logo"></span>
            <span class="logo-wordmark">Nimiq</span>
        </header>

        <AnnouncementBox/>

        <PriceChart currency="nim"/>
        <PriceChart currency="btc" :showTimespanLabel="false"/>

        <!-- <div class="trade-actions">
            <button class="nq-button-s inverse" @click="$router.push('/trade')" :disabled="$route.name !== 'root'">
                {{ $t('Buy') }}
            </button>
            <button class="nq-button-s inverse" @click="$router.push('/trade')" :disabled="$route.name !== 'root'">
                {{ $t('Sell') }}
            </button>
        </div> -->

        <div class="flex-grow"></div>

        <AccountMenu/>

        <button
            class="network reset flex-row"
            :class="{'active': $route.name === 'network'}"
            @click="$router.push('/network').catch(() => {})"
        >
            <ConsensusIcon/>
            <span class="label">{{ $t('Network') }}</span>
        </button>
        <button
            class="settings reset flex-row"
            :class="{'active': $route.name === 'settings'}"
            @click="$router.push('/settings').catch(() => {})"
        >
            <GearIcon/>
            <span class="label">{{ $t('Settings') }}</span>
        </button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { GearIcon } from '@nimiq/vue-components';

import AnnouncementBox from '../AnnouncementBox.vue';
import AccountMenu from '../AccountMenu.vue';
import PriceChart from '../PriceChart.vue';
import ConsensusIcon from '../ConsensusIcon.vue';

export default defineComponent({
    name: 'sidebar',
    components: {
        AnnouncementBox,
        GearIcon,
        PriceChart,
        AccountMenu,
        ConsensusIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.sidebar {
    @include flex-full-height;
    align-items: center;
    background: var(--nimiq-blue);
    color: white;
    min-width: 21rem;
    padding: 2.75rem 1.5rem 1.5rem;
}

> * {
    margin: 1rem 0;
}

.logo {
    color: white;
    margin-bottom: 3.5rem;
}

.announcement-box {
    margin-bottom: 2.5rem;
}

.price-chart {
    height: 15rem;
    width: 100%;
    padding: 1.5rem;

    /deep/ .timespan {
        left: 1.5rem;
        top: 0.5rem;
    }
}

.trade-actions .nq-button-s {
    margin: 0 1rem;
}

.account-list {
    flex-grow: 1;
}

.settings,
.network {
    align-items: center;
    width: 100%;
    color: rgba(255, 255, 255, .3);
    margin-top: 1rem;
    padding: 1.75rem 1.5rem;
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

        .label{
            color: rgba(255, 255, 255, 1);
        }
    }
}
</style>
