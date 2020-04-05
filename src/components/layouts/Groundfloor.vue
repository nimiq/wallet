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
    width: 100%;
    height: 100%;
    position: relative;
}
</style>
