<template>
    <div class="flicker"
        @click="toggle(featureName)"
        :class="{ disabled: !active }"
        :title="featureName">
        <StakingHeroIcon />
    </div>
</template>

<script type="ts">
import { defineComponent, computed } from '@vue/composition-api';
import StakingHeroIcon from '../icons/Staking/StakingHeroIcon.vue';

export default defineComponent({
    setup(props) {
        const active = computed(() => props.ENABLED[props.featureName]);
        const toggle = (featureName) => {
            props.ENABLED[featureName] = !props.ENABLED[featureName];
            alert(`${featureName} FEATURE ${props.ENABLED[featureName] ? 'enabled' : 'disabled'} !`);
        };

        return {
            active,
            toggle,
        };
    },
    props: {
        featureName: {
            type: String,
            required: true,
        },
        ENABLED: {
            type: Object,
            required: true,
        },
    },
    components: {
        StakingHeroIcon,
    },
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

        &.disabled {
            /deep/ svg {
                animation: none;
                path:nth-child(1), path:nth-child(2), path:nth-child(4) {
                    animation: none;
                }
                path {
                    fill: grey;
                }
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
