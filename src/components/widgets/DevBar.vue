<template>
    <div v-if="visible && ENABLED" class="dev-bar">
        <span class="feature-bar">
            <FeatureToggler featureName="necklace" :ENABLED="ENABLED" />
            <FeatureToggler featureName="stackattack" :ENABLED="ENABLED" />
        </span>
        <span class="mockpare">
            <Mockpare />
        </span>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, ref, reactive } from '@vue/composition-api';
import FeatureToggler from './FeatureToggler.vue';
import Mockpare from './Mockpare.vue';

// This section and dev-tools are also useful for the community as they might find it easier to present the
// difference between their feature improvement/proposal and existing wallet functionality

export const ENABLED_FEATURES = Vue.observable({
    necklace: true,
    stackattack: false,
});

export default defineComponent({
    setup() {
        const visible = ref(process.env.NODE_ENV === 'development');

        return {
            ENABLED: ENABLED_FEATURES,
            visible,
        };
    },
    components: {
        FeatureToggler,
        Mockpare,
    },
});
</script>

<style lang="scss" scoped>

</style>
