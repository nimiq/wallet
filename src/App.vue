<template>
    <div id="app">
        <main>
            <Sidebar />
            <AccountOverview />
            <AddressOverview />
        </main>
        <router-view />
    </div>
  <!-- #app -->
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';

import Sidebar from './components/layouts/Sidebar.vue';
import AccountOverview from './components/layouts/AccountOverview.vue';
import AddressOverview from './components/layouts/AddressOverview.vue';

export default createComponent({
    name: 'app',
    components: {
        Sidebar,
        AccountOverview,
        AddressOverview,
    },
});
</script>

<style scoped lang="scss">
@import './scss/mixins.scss';
#app {
    @include flex-full-height;
    main {
        @include flex-full-height;
        flex-direction: row;
    }

    .grow {
        display: flex;
        flex-grow: 1;
    }
}
</style>
