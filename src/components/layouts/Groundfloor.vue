<template>
    <div class="groundfloor flex-row">

        <div>
            <transition :name="preventNextTransition ? 'none' : 'fade'">
                <keep-alive>
                    <router-view name="accountOverview"/>
                </keep-alive>
            </transition>
            <transition :name="preventNextTransition ? 'none' : 'fade'">
                <router-view name="settings"/>
            </transition>
        </div>

        <div>
            <transition name="slide-right">
                <keep-alive>
                    <router-view name="addressOverview"/>
                </keep-alive>
            </transition>
        </div>

        <div class="mobile-tap-area" @click="$router.back()"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import { useRouter } from '@/router';

export default defineComponent({
    setup() {
        const router = useRouter();
        const preventNextTransition = ref(false);

        watch(() => router.currentRoute, (to) => {
            preventNextTransition.value = to.name === 'network';
        });

        return {
            preventNextTransition,
        };
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/functions.scss';

.groundfloor {
    background: var(--bg-base);
    height: 100%;
    position: relative;
}

.mobile-tap-area {
    display: none;
}

.settings {
    position: relative; // iOS Safari fix to make settings fill the screen width
    width: calc(100vw - var(--sidebar-width));
}

@media (max-width: $halfMobileBreakpoint) { // Half mobile breakpoint
    .mobile-tap-area {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: nimiq-blue(0.6);
        opacity: 0;
        pointer-events: none;

        transition: opacity var(--transition-time) var(--nimiq-ease);
    }

    .settings {
        width: 100vw;
    }
}
</style>
