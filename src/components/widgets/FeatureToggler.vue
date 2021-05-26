<template>
    <div class="flicker" @click="toggle(featureName)" :title="featureName">
        <StakingHeroIcon />
    </div>
</template>

<script type="ts">
import { defineComponent } from '@vue/composition-api';
import { ENABLED } from '../../lib/FeatureProposal';
import StakingHeroIcon from '../icons/Staking/StakingHeroIcon.vue';

const toggle = (featureName) => {
    ENABLED[featureName] = !ENABLED[featureName];
    alert(`${featureName} FEATURE ${ENABLED[featureName]?'enabled':'disabled'} !`);
}

export default defineComponent({
    setup(props) {
        return {
            toggle,
        };
    },
    props: {
        featureName: {
            type: String,
            required: true,
        },
    },
    components: {
        StakingHeroIcon,
    }
});
</script>

<style lang="scss" scoped>
    .flicker {
        display: inline-block;
        cursor: pointer;
        width: 3rem;
        height: 3rem;
        
        /deep/ svg {
            width: 3rem;
            height: 3rem;
            animation: flicker 5s ease alternate infinite;
            path:nth-child(1), path:nth-child(2), path:nth-child(4) {
                animation: fastwave 1s ease alternate infinite;
            }
        }
    }
    @keyframes flicker {
        0% {
            opacity: 1.0;
        }
        97% {
            opacity: 0.9;
        }
        98% {
            opacity: 0.0;
        }
        100% {
            opacity: 1.0;
        }
    }
    @keyframes fastwave {
        0% {
            opacity: 1.0;
        }
        50% {
            opacity: 0.15;
        }
        100% {
            opacity: 0.0;
        }
    }
</style>
 