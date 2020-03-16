<template>
    <div id="app">
        <main>
            <Sidebar/>

            <transition name="delay">
                <router-view name="basement"/>
            </transition>

            <transition name="slide-right">
                <keep-alive>
                    <router-view name="groundfloor"/>
                </keep-alive>
            </transition>
        </main>

        <transition name="fade">
            <PreviewNoticeModal v-if="showPreviewNotice" :emitClose="true" @close="showPreviewNotice = false"/>
        </transition>
    </div><!-- #app -->
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';

import Sidebar from './components/layouts/Sidebar.vue';
import PreviewNoticeModal from './components/modals/PreviewNoticeModal.vue';
import router, { provideRouter } from './router';
import { TESTNET_ORIGIN } from './lib/Constants';

export default defineComponent({
    name: 'app',
    setup() {
        provideRouter(router);

        const showPreviewNotice = ref(window.location.origin === TESTNET_ORIGIN);

        return {
            showPreviewNotice,
        };
    },
    components: {
        Sidebar,
        PreviewNoticeModal,
    },
});
</script>

<style scoped lang="scss">
@import './scss/mixins.scss';
#app {
    @include flex-full-height;
    overflow: hidden; // To prevent horizontal scrollbars during panel sliding

    main {
        @include flex-full-height;
        flex-direction: row;
        width: 100%;

        $sidebarWidth: 21rem;

        .sidebar {
            width: $sidebarWidth;
        }

        .groundfloor {
            width: 100%;
            position: relative;
        }

        /deep/ .account-overview {
            width: 60rem;
            z-index: 2;
        }

        /deep/ .address-overview {
            width: 100rem;
            z-index: 3;
        }

        .network {
            position: absolute;
            top: 0;
            left: $sidebarWidth;
            width: calc(100% - #{$sidebarWidth});
            height: 100%;
            z-index: 0;
        }
    }
}
</style>

<style lang="scss">
$transitionTime: 0.75;

.fade-enter-active, .fade-leave-active {
    transition: opacity #{$transitionTime}s var(--nimiq-ease);

    &.settings {
        // The address-overview is flex-row positioned next to the account-overview.
        // The settings view has a very different width than the account-overview,
        // So to not disturb the relative positioning of the address-overview during
        // the slide-right animation, the settings content must be positioned absolute.
        position: absolute;
        left: 0;
        top: 0;
    }

    &.backdrop { // Modals
        transition-duration: 0.4s;
    }
}

.fade-enter-active.account-overview,
.fade-enter-active.settings {
    transition-delay: #{$transitionTime / 2}s;
}

.fade-enter,
.fade-leave-to {
    opacity: 0 !important;
}

.network {
    &.delay-leave-active {
        /* the network can only disappear once the other transitions are finished so add a delay */
        transition-delay: #{$transitionTime}s;
    }
}

.groundfloor,
.address-overview {
    transition: transform #{$transitionTime}s var(--nimiq-ease);
}

.groundfloor {
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

    .slide-right-enter &,
    .slide-right-leave-to & {
        transform: translate3d(-60rem, 0, 0);
    }
}
</style>
