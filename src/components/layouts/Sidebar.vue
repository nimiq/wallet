<template>
    <div class="sidebar">
        <div class="padding flex-column">
            <header class="logo">
                <span class="nq-icon nimiq-logo"></span>
                <span class="logo-wordmark">Nimiq</span>
                <span class="logo-subtitle"></span>
            </header>

            <div v-if="activeAccountInfo && !activeAccountInfo.fileExported" class="backup-warning nq-orange-bg">
                <AlertTriangleIcon class="alert-icon"/>
                <h2>Secure<br>your Account</h2>
                <p>Download your Login File to secure access to your Account.</p>
                <button class="nq-button-s inverse" @click="backup(activeAccountInfo.id)">
                    Login File<ArrowRightSmallIcon/>
                </button>
            </div>

            <PriceChart currency="nim" class="graph" />
            <PriceChart currency="btc" class="graph" />

            <div class="trade-actions">
                <button class="nq-button-s inverse" @click="$router.push('/trade')">
                    {{ $t('Buy') }}
                </button>
                <button class="nq-button-s inverse" @click="$router.push('/trade')">
                    {{ $t('Sell') }}
                </button>
            </div>

            <div class="flex-grow"></div>

            <AccountMenu />

            <button class="settings reset flex-row" href="#" @click.prevent="$router.push('/settings')">
                <GearIcon/>
                <span class="settings-label">{{ $t('Settings') }}</span>
            </button>
        </div>

        <ConsensusIndicator/>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { GearIcon, ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';

import AccountMenu from '../AccountMenu.vue';
import PriceChart from '../PriceChart.vue';
import ConsensusIndicator from '../ConsensusIndicator.vue';
import { useAccountStore } from '../../stores/Account';
import { backup } from '../../hub';

export default createComponent({
    name: 'sidebar',
    setup() {
        const { activeAccountInfo } = useAccountStore();

        return {
            activeAccountInfo,
            backup,
        };
    },
    components: {
        GearIcon,
        ArrowRightSmallIcon,
        AlertTriangleIcon,
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
    padding: 2rem 1.5rem 1.5rem;
    align-items: center;
}

> * {
    margin: 1rem 0;
}

.logo {
    color: white;
    margin-bottom: 4rem;
}

.backup-warning {
    position: relative;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
}

.backup-warning .alert-icon {
    font-size: 2.5rem;
    position: absolute;
    right: 1.5rem;
    top: 1.5rem;
}

.backup-warning h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-top: 1rem;
}

.backup-warning p {
    font-size: 1.75rem;
    opacity: 0.7;
}

.backup-warning button .nq-icon {
    font-size: 1.25rem;
    vertical-align: middle;
    margin-bottom: 0.25rem;
    margin-left: 0.625rem;
}

.graph {
    display: flex;
    height: 15rem;
    width: 100%;
    padding: 1.5rem;
    flex-grow: 0;
}

.graph:first-of-type {
    margin-top: 2rem;
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
