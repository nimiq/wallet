<template>
    <div class="slider-container">
        <div class="slider-body">
            <div class="slider-background">
                <VerticalLineIcon
                    v-for="index in Array(27)"
                    :key="index" />
                <div class="gliph">
                    <StakingIcon />
                </div>
                <VerticalLineIcon
                    v-for="index in Array(27)"
                    :key="index" />
                <div class="gliph">
                    <ThreeLeafStakingIcon />
                </div>
            </div>
            <div class="slider-gradation">
            </div>
            <div class="slider-controls">
                <div class="slider-knob">
                    <OneLeafStakingIcon v-if="stakedAmount < 50" />
                    <StakingIcon v-else-if="stakedAmount < 75" />
                    <ThreeLeafStakingIcon v-else/>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import OneLeafStakingIcon from '../icons/Staking/OneLeafStakingIcon.vue';
import ThreeLeafStakingIcon from '../icons/Staking/ThreeLeafStakingIcon.vue';
import VerticalLineIcon from '../icons/Staking/VerticalLineIcon.vue';

export default defineComponent({
    setup() {
        const readonly = ref(false);
        const stakedAmount = ref(0);

        return {
            readonly,
            stakedAmount,
        };
    },
    props: {
    },
    components: {
        StakingIcon,
        OneLeafStakingIcon,
        ThreeLeafStakingIcon,
        VerticalLineIcon,
    },
});
</script>

<style lang="scss" scoped>
.slider-container {
    width: 63.5rem;
    height: 11.875rem;
    margin: auto;
    .slider-body {
        position: relative;
        margin: auto;
        margin-top: 2rem;// temporary
        width: 56rem;
        height: 5rem;
        background-color: #f2f2f4;
        border-radius: 2.5rem;
        .slider-background {
            position: absolute;
            left: 0;
            top: 0;
            padding-top: 0.75rem;
            padding-left: 2rem;
            > svg {
                margin-right: 0.6rem;
                line {
                    stroke: #9e9faf;
                }
            }
            .gliph {
                display: inline-block;
                svg {
                    width: 3.5rem;
                    margin-left: -0.125rem;
                    margin-right: 0.375rem;
                    line, path {
                        stroke: #9e9faf;
                        stroke-width: 1;
                    }
                }
            }
        }
        .slider-gradation {
            position: absolute;
            left: 0;
            top: 7rem;
        }
        .slider-controls {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            .slider-knob {
                display: flex;
                align-items: center;
                margin-top: 0.25rem;
                width: 4.5rem;
                height: 4.5rem;
                background-color: #fff;
                border-radius: 50%;
                box-shadow: 0rem .5rem 2rem rgba(0, 0, 0, 0.1),
                            0rem .1875rem .375rem rgba(0, 0, 0, 0.08),
                            0rem 0.03rem .25rem rgba(0, 0, 0, 0.06);
                svg {
                    width: 3.5rem;
                    margin-left: 0.5rem;
                    line, path {
                        stroke-width: 1;
                    }
                }
            }
        }
    }
}
</style>
