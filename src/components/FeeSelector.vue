<template>
    <div class="fee-selector flex-row">
        <SpeedGauge :speed="speed"/>
        <div class="flex-grow"></div>
        <!-- eslint-disable max-len -->
        <button class="reset" @click="delay = 36" :class="{'active': delay === 36}">{{ $t('6h+') }}</button>
        <button class="reset" @click="delay = 12" :class="{'active': delay === 12}">{{ $t('2-4h') }}</button>
        <button class="reset" @click="delay = 1"  :class="{'active': delay === 1}" >{{ $t('15m') }}</button>
        <!-- eslint-enable max-len -->
        <div class="flex-grow"></div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from 'vue';
import { ENV_MAIN } from '../lib/Constants';
import { useConfig } from '../composables/useConfig';
import SpeedGauge from './SpeedGauge.vue';

export default defineComponent({
    props: {
        fees: {
            type: Array as () => number[],
            required: true,
        },
    },
    setup(props, context) {
        const { config } = useConfig();
        const delay = ref(12); // 2-4h

        watch([() => props.fees, delay], ([fees]) => {
            const availableDelay = Math.min((fees as number[]).length - 1, delay.value);
            let fee = (fees as number[])[availableDelay] || 1;

            // Set minimum fees for each step

            if (config.environment === ENV_MAIN) {
                switch (delay.value) {
                    case 1: fee = Math.max(fee, 20); break;
                    case 12: fee = Math.max(fee, 10); break;
                    default: fee = Math.max(fee, 5); break;
                }
            } else {
                switch (delay.value) {
                    case 1: fee = Math.max(fee, 3); break;
                    case 12: fee = Math.max(fee, 2); break;
                    default: fee = Math.max(fee, 1); break;
                }
            }

            context.emit('fee', fee);
        });

        const speed = computed(() => {
            switch (delay.value) {
                case 1: return 100;
                case 12: return 50;
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
    .fee-selector {
        justify-content: space-between;
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
        // &:nth-of-type(2).active { background: radial-gradient(100% 100% at 100% 100%, #444C86 0%, #425DAD 100%); }
        &:nth-of-type(2).active { background: radial-gradient(100% 100% at 100% 100%, #5F4B8B 0%, #4D4C96 100%); }
        // &:nth-of-type(4).active { background: radial-gradient(100% 100% at 100% 100%, #96467D 0%, #BF6D8A 100%); }
        &:nth-of-type(3).active { background: radial-gradient(100% 100% at 100% 100%, #E0516B 0%, #FA7268 100%); }
    }
</style>
