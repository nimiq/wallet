<template>
    <div id="app">
        <main>
            <Sidebar />

            <transition name="slide-right">
                <keep-alive>
                    <router-view name="accountOverview" />
                </keep-alive>
            </transition>

            <transition name="slide-right">
                <keep-alive>
                    <router-view name="addressOverview" />
                </keep-alive>
            </transition>

            <transition name="delay">
                <router-view name="fullpage" />
            </transition>
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
import router, { provideRouter } from './router';

export default defineComponent({
    name: 'app',
    setup() {
        provideRouter(router);
    },
    components: {
        Sidebar,
    },
});
</script>

<style scoped lang="scss">
@import './scss/mixins.scss';
#app {
    @include flex-full-height;
    overflow: hidden;

    main {
        @include flex-full-height;
        flex-direction: row;

        .sidebar {
            width: 21rem;
        }

        .account-overview {
            max-width: 60rem;
            position: relative;
            z-index: 3;
        }

        .address-overview {
            max-width: 100rem;
            position: relative;
            z-index: 4;
        }

        .address-overview::after {
            content: ' ';
            display: flex;
            left: 100%;
            top: 0;
            position: absolute;
            z-index: 2;
            width: calc(100vw - 181rem);
            height: 100%;
            background: var(--nimiq-gray);
        }

        .network {
            position: absolute;
            top: 0;
            left: 21rem;
            width: calc(100% - 21rem);
            height: 100%;
            z-index: 1;
        }
    }
}
</style>

<style lang="scss">
$transitionTime: 0.75;

.fade-enter-active, .fade-leave-active {
    transition: opacity .3s var(--nimiq-ease);
}

.fade-enter,
.fade-leave-to {
    opacity: 0 !important;
}

.network {
    &.delay-leave-active {
        /* the network can only disappear once the other transitions are finished so add a delay */
        transition: transform 0s #{$transitionTime}s linear;
    }
}

.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform #{$transitionTime}s var(--nimiq-ease);
}

.slide-right-enter-to,
.slide-right-leave {
    transform: translate3d(0, 0, 0);
}

.account-overview {
    &.slide-right-enter,
    &.slide-right-leave-to {
        transform: translate3d(calc(100vw - 21rem), 0, 0);
    }
}

.address-overview {
    &.slide-right-enter,
    &.slide-right-leave-to {
        transform: translate3d(calc(100vw - 60rem - 21rem), 0, 0);
    }
}
</style>
