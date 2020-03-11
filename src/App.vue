<template>
    <div id="app">
        <main>
            <Sidebar />
            <router-view name="accountOverview" />
            <router-view name="fullpage" />
            <router-view name="addressOverview" />
        </main>

        <transition name="fade">
            <router-view />
        </transition>
    </div>
  <!-- #app -->
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

import Sidebar from './components/layouts/Sidebar.vue';
import AccountOverview from './components/layouts/AccountOverview.vue';
import AddressOverview from './components/layouts/AddressOverview.vue';
import router, { provideRouter } from './router';

export default defineComponent({
    name: 'app',
    setup() {
        provideRouter(router);
    },
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

        .sidebar {
            max-width: 21rem;
        }

        .account-overview {
            max-width: 60rem;
        }

        .address-overview {
            max-width: 100rem;
        }
    }
}
</style>

<style>
.fade-enter-active, .fade-leave-active {
    transition: opacity .3s var(--nimiq-ease);
}

.fade-enter,
.fade-leave-to {
    opacity: 0 !important;
}
</style>
