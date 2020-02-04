<template>
    <div class="sidebar">
        <header class="logo">
            <span class="nq-icon nimiq-logo"></span>
            <span class="logo-wordmark">Nimiq</span>
            <span class="logo-subtitle"></span>
        </header>

        <PriceChart currency="nim" class="graph" />
        <PriceChart currency="btc" class="graph" />

        <div>
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
import { GearIcon } from '@nimiq/vue-components';
import AccountMenu from '../AccountMenu.vue';
import PriceChart from '../PriceChart.vue';

export default createComponent({
    name: 'sidebar',
    components: {
        GearIcon,
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
    margin-bottom: 6rem;
}

.graph {
    display: flex;
    height: 14rem;
    width: 100%;
    padding: 1.5rem;
    flex-grow: 0;
}

.nq-button-s {
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
