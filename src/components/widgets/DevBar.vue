<template>
    <div v-if="visible && ENABLED" class="dev-bar">
        <span class="features">
            <FeatureToggler featureName="necklace" :ENABLED="ENABLED" />
            <FeatureToggler featureName="stackattack" :ENABLED="ENABLED" />
            <FeatureToggler featureName="dualSlider" :ENABLED="ENABLED" />
        </span>
        <span>
            <Mockpare />
        </span>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, ref } from '@vue/composition-api';
import FeatureToggler from './FeatureToggler.vue';
import Mockpare from './Mockpare.vue';

// This section and dev-tools are also useful for the community as they might find it easier to present the
// difference between their feature improvement/proposal and existing wallet functionality

export const ENABLED_FEATURES = Vue.observable({
    necklace: false,
    stackattack: false,
    dualSlider: false,
});

export default defineComponent({
    setup() {
        const visible = ref(process.env.NODE_ENV === 'development'
        || /https:\/\/wallet\.nimiq-testnet.com/.test(window.location.href));

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
    .dev-bar {
        white-space: nowrap;
        pointer-events: initial;
        .features {
            display: inline-flex;
            flex-direction: row;
            height: 100%;
        }
    }
    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        .dev-bar {
            position: absolute;
            top: 1.5rem;
            right: calc((100vw - 230px) / 2.0);
            .features {
                position: relative;
                left: -1rem;
                flex-direction: column;
                .flicker {
                    width: 1.5rem;
                    height: 1.5rem;
                    /deep/ svg {
                        position: relative;
                        top: -.5rem;
                        width: 1.5rem;
                        height: 1.5rem;
                    }
                }
            }
            /deep/ select, /deep/ button {
                font-size: .75rem;
            }
        }
    }
</style>
