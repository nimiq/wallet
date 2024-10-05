<template>
    <div class="prestaking-button">
        <Tooltip
            v-if="asButton && visible && activeAddressInfo && (activeAddressInfo.balance || hasPrestake)"
            class="prestaking-feature-tip"
            preferredPosition="bottom"
            :container="this.$parent"
            ref="$tooltip">
            <div slot="trigger">
                <button class="prestake"
                    :class="{
                        disabled: !activeAddressInfo || (!activeAddressInfo.balance && !hasPrestake),
                        inverse: inversePalette,
                        pulsing: !hasPrestake,
                    }" @click="$router.push('/prestaking')"
                    @mousedown.prevent
                    :disabled="!activeAddressInfo || (!activeAddressInfo.balance && !hasPrestake)">
                    <HeroIcon :pulsing="!hasPrestake" />
                </button>
            </div>
            <span v-if="!hasPrestake">{{ $t('Prestaking is now available!') }}</span>
            <span v-else>{{ $t('Prestaking') }}</span>
        </Tooltip>
        <div class="prestake"
            v-if="!asButton"
            :class="{
                inverse: inversePalette,
            }">
            <HeroIcon :pulsing="false" />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { usePrestakingStore } from '../../stores/Prestaking';
import { useConfig } from '../../composables/useConfig';

import HeroIcon from '../icons/Prestaking/HeroIcon.vue';

export default defineComponent({
    props: {
        asButton: {
            type: Boolean,
            required: false,
            default: true,
        },
        inversePalette: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activePrestake } = usePrestakingStore();

        const hasPrestake = computed(() => !!activePrestake.value);

        const { config } = useConfig();

        const now = ref(Date.now());
        setInterval(() => {
            now.value = Date.now();
        }, 1000);
        const visible = computed(() => now.value >= config.prestaking.startDate.getTime()
            && (now.value <= config.prestaking.endDate.getTime() || hasPrestake.value));

        const $tooltip = ref<Tooltip | null>(null);
        // watch([hasPrestake, activeAddressInfo], ([has, _]) => {
        //     if (!has && $tooltip.value && visible.value) {
        //         ($tooltip.value.$el.querySelector('.trigger') as HTMLAnchorElement).focus();
        //     }
        // });

        return {
            activeAddressInfo,
            visible,
            hasPrestake,
            $tooltip,
        };
    },
    components: {
        Tooltip,
        HeroIcon,
    },
});
</script>

<style lang="scss" scoped>
.prestaking-button {
    height: 6.75rem;
    margin: -1.25rem 0;

    & ::v-deep svg {
        font-size: 6.75rem;
    }
}

.prestake {
    display: block;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
    transition: opacity 1s ease-in-out;

    &.disabled {
        & ::v-deep svg {
            animation: initial;
            path:nth-child(1), path:nth-child(2), path:nth-child(4) {
                animation: initial;
                opacity: 0;
            }
        }
        cursor: not-allowed;
    }
    &.inverse {
        cursor: initial;
        path:nth-child(1), path:nth-child(2), path:nth-child(4) {
            stroke: white;
        }
    }
}

.tooltip.prestaking-feature-tip {
    ::v-deep .trigger::after {
        background-color: var(--nimiq-gold);
        transform: translateY(-0.9rem);
    }

    ::v-deep .tooltip-box {
        background: radial-gradient(100% 100% at 100% 100%, #EC991C 0%, var(--nimiq-gold) 100%);
        color: white;
        font-size: 1.75rem;
        font-style: normal;
        font-weight: 700;
        line-height: 140%;
        padding: 0.5rem 1rem;
        white-space: nowrap;
        transform: translateY(1rem);
    }
}
</style>
