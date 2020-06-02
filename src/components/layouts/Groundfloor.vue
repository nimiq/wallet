<template>
    <div class="groundfloor flex-row">
        <transition name="fade">
            <keep-alive>
                <router-view name="accountOverview"/>
            </keep-alive>
        </transition>

        <transition name="fade">
            <router-view name="settings"/>
        </transition>

        <transition name="slide-right">
            <keep-alive>
                <router-view name="addressOverview"/>
            </keep-alive>
        </transition>

        <div class="mobile-tap-area" @click="$router.push('/account')"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({

});
</script>

<style lang="scss" scoped>
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
}

@media (max-width: 700px) { // Full mobile breakpoint
    .mobile-tap-area {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: rgba(31, 35, 72, 0.6);
        opacity: 0;
        pointer-events: none;

        transition: opacity var(--transition-time) var(--nimiq-ease);
    }
}
</style>
