<template>
    <div class="sidebar">
        <div class="padding flex-column">
            <header class="logo">
                <span class="nq-icon nimiq-logo"></span>
                <span class="logo-wordmark">Nimiq</span>
            </header>

            <AnnouncementBox/>

            <PriceChart currency="nim" class="graph"/>
            <PriceChart currency="btc" class="graph"/>

            <div class="trade-actions">
                <button class="nq-button-s inverse" @click="$router.push('/trade')">
                    {{ $t('Buy') }}
                </button>
                <button class="nq-button-s inverse" @click="$router.push('/trade')">
                    {{ $t('Sell') }}
                </button>
            </div>

            <div class="flex-grow"></div>

            <AccountMenu/>

            <button class="settings reset flex-row" href="#" @click.prevent="$router.push('/settings')">
                <GearIcon/>
                <span class="settings-label">{{ $t('Settings') }}</span>
            </button>
        </div>
        <span @click.prevent="$router.push('/network')">
            <ConsensusIndicator />
        </span>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { GearIcon } from '@nimiq/vue-components';

import AnnouncementBox from '../AnnouncementBox.vue';
import AccountMenu from '../AccountMenu.vue';
import PriceChart from '../PriceChart.vue';
import ConsensusIndicator from '../ConsensusIndicator.vue';

export default defineComponent({
    name: 'sidebar',
    components: {
        AnnouncementBox,
        GearIcon,
        PriceChart,
        AccountMenu,
        ConsensusIndicator,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.sidebar {
    @include flex-full-height;
    flex-direction: column;
    background: var(--nimiq-blue-bg);
    color: white;
    min-width: 21rem;
}

.padding {
    width: 100%;
    flex-grow: 1;
    padding: 2.75rem 1.5rem 1.5rem;
    align-items: center;
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

.graph {
    display: flex;
    height: 15rem;
    width: 100%;
    padding: 1.5rem;
    flex-grow: 0;
}

.trade-actions .nq-button-s {
    margin: 0 1rem;
}

.account-list {
    flex-grow: 1;
}

.settings {
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
}

.settings:hover,
.settings:focus {
    background: rgba(255, 255, 255, .1);
    color: rgba(255, 255, 255, .5);
}

.settings-label {
    margin-left: 2rem;
    color: rgba(255, 255, 255, .7);
    font-size: 2rem;

    transition: color 0.2s var(--nimiq-ease);
}

.settings:hover .settings-label,
.settings:focus .settings-label {
    color: rgba(255, 255, 255, 1);
}
</style>
