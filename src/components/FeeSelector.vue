<template>
    <div class="fee-estimator flex-row">
        <SpeedGauge :speed="speed"/>
        <!-- eslint-disable max-len -->
        <button class="reset"  @click="delay = 72" :class="{'active': delay === 72}">12h</button>
        <button class="reset"  @click="delay = 36" :class="{'active': delay === 36}">6h</button>
        <button class="reset"  @click="delay = 6"  :class="{'active': delay === 6}" >1h</button>
        <button class="reset"  @click="delay = 3"  :class="{'active': delay === 3}" >30m</button>
        <button class="reset"  @click="delay = 1"  :class="{'active': delay === 1}" >10m</button>
        <!-- eslint-enable max-len -->
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from '@vue/composition-api';
import SpeedGauge from './SpeedGauge.vue';

export default defineComponent({
    props: {
        fees: {
            type: Array as () => number[],
            required: true,
        },
    },
    setup(props, context) {
        const delay = ref(6); // 1 hour

        watch([() => props.fees, delay], ([fees]) => {
            const availableDelay = Math.min((fees as number[]).length - 1, delay.value);
            context.emit('fee', (fees as number[])[availableDelay]);
        });

        const speed = computed(() => {
            switch (delay.value) {
                case 1: return 100;
                case 3: return 75;
                case 6: return 50;
                case 36: return 25;
                default: return 0;
            }
        });

        return {
            delay,
            speed,
        };
    },
    components: {
        SpeedGauge,
    },
});
</script>

<style lang="scss" scoped>
    .fee-estimator {
        align-items: center;
    }

    .speed-gauge {
        width: 3rem;
        height: 3rem;
        color: var(--text-40);
        margin-right: 1rem;
    }

    button {
        font-size: var(--label-size);
        font-weight: bold;
        color: var(--text-50);
        padding: 0.75rem;
        background: var(--nimiq-highlight-bg);
        border-radius: 0.5rem;
        margin-left: 0.5rem;

        transition: color 0.2s var(--nimiq-ease);

        &:disabled {
            opacity: 0.5;
        }

        &:hover,
        &:focus {
            color: var(--text-80);
        }

        &.active {
            color: white;
        }

        &:nth-of-type(1).active { background: radial-gradient(100% 100% at 100% 100%, #265DD7 0%, #0582CA 100%); }
        &:nth-of-type(2).active { background: radial-gradient(100% 100% at 100% 100%, #444C86 0%, #425DAD 100%); }
        &:nth-of-type(3).active { background: radial-gradient(100% 100% at 100% 100%, #5F4B8B 0%, #4D4C96 100%); }
        &:nth-of-type(4).active { background: radial-gradient(100% 100% at 100% 100%, #96467D 0%, #BF6D8A 100%); }
        &:nth-of-type(5).active { background: radial-gradient(100% 100% at 100% 100%, #E0516B 0%, #FA7268 100%); }
    }
</style>
