<template>
    <div class="sidebar">
        <header class="logo">
            <span class="nq-icon nimiq-logo"></span>
            <span class="logo-wordmark">Nimiq</span>
            <span class="logo-subtitle"></span>
        </header>
        <PriceChart currency="nim" class="graph" />
        <PriceChart currency="btc" class="graph" />
        <button class="nq-button inverse" @click="$router.push('/trade')">Buy/Sell</button>
        <div class="grow"></div>
        <WalletList />
        <a class="settings" href="#" @click.prevent="$router.push('/settings')">
            <GearIcon />
            <span>Settings</span>
        </a>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import { GearIcon } from '@nimiq/vue-components';
import WalletList from '../WalletList.vue';
import PriceChart from '../PriceChart.vue';

export default createComponent({
    name: 'sidebar',
    components: {
        GearIcon,
        PriceChart,
        WalletList,
    },
});
</script>

<style lang="scss">
@import '../../scss/mixins.scss';
.sidebar {
    @include flex-full-height;
    background: var(--nimiq-blue-bg);
    flex-direction: column;
    align-items: center;
    padding: 2rem 4rem;
    > * {
        margin: 2rem 0;
    }

    .logo {
        color: white;
        margin-bottom: 6rem;
    }

    .graph {
        display: flex;
        height: 14rem;
        width: 100%;
        flex-grow: 0;
    }

    > .nq-button {
        min-width: auto;
    }

    .settings {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        width: 100%;
        color: rgba(255, 255, 255, .7);
        margin-top: 4rem;
    }
}
</style>
