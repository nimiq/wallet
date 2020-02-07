<template>
    <div class="sidebar">
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
            <button class="nq-button-s inverse" @click="$router.push('/trade').catch(()=>{})">{{ $t('Buy') }}</button>
            <button class="nq-button-s inverse" @click="$router.push('/trade').catch(()=>{})">{{ $t('Sell') }}</button>
        </div>

        <div class="flex-grow"></div>

        <AccountMenu />

        <a class="settings" href="#" @click.prevent="$router.push('/settings')">
            <GearIcon />
            <span>{{ $t('Settings') }}</span>
        </a>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { GearIcon, ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';

import AccountMenu from '../AccountMenu.vue';
import PriceChart from '../PriceChart.vue';
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
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.sidebar {
    @include flex-full-height;
    background: var(--nimiq-blue-bg);
    flex-direction: column;
    align-items: center;
    padding: 2rem 1.5rem;
    color: white;
    min-width: 21rem;
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
    @include flex-row;
    justify-content: space-evenly;
    width: 100%;
    color: rgba(255, 255, 255, .7);
    margin-top: 3rem;
}
</style>
