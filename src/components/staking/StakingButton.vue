<template>
    <div class="staking-button">
        <Tooltip
            v-if="asButton && visible && activeAddressInfo && activeAddressInfo.balance"
            class="staking-feature-tip"
            preferredPosition="bottom"
            :container="this.$parent"
            ref="$tooltip">
            <div slot="trigger">
                <button class="stake"
                    :class="{
                        disabled: !activeAddressInfo || !activeAddressInfo.balance,
                        inverse: inversePalette,
                        pulsing: !hasStake,
                    }" @click="$router.push('/staking')"
                    @mousedown.prevent
                    :disabled="!activeAddressInfo || !activeAddressInfo.balance">
                    <HeroIcon />
                </button>
            </div>
            <span v-if="!hasStake">{{ $t('Prestaking is now available!') }}</span>
            <span v-else>{{ $t('Prestaking') }}</span>
        </Tooltip>
        <div class="stake"
            v-if="!asButton"
            :class="{
                inverse: inversePalette,
            }">
            <HeroIcon />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, watch, ref } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import Config from 'config';
import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';
import { useNetworkStore } from '../../stores/Network';
import { ENV_MAIN, PRESTAKING_BLOCK_H_END, PRESTAKING_BLOCK_H_START } from '../../lib/Constants';

import HeroIcon from '../icons/Staking/HeroIcon.vue';

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
        const { height } = useNetworkStore();
        const { activeStake } = useStakingStore();

        const visible = computed(() => Config.environment !== ENV_MAIN
            && height.value >= PRESTAKING_BLOCK_H_START
            && (height.value <= PRESTAKING_BLOCK_H_END || activeStake.value));

        const hasStake = computed(() => !!activeStake.value);

        const $tooltip = ref<Tooltip | null>(null);
        // watch([hasStake, activeAddressInfo], ([has, _]) => {
        //     if (!has && $tooltip.value && visible.value) {
        //         ($tooltip.value.$el.querySelector('.trigger') as HTMLAnchorElement).focus();
        //     }
        // });

        return {
            activeAddressInfo,
            visible,
            hasStake,
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
.staking-button {
    height: 6.75rem;
    margin: -1.25rem 0;
}

.stake {
    display: block;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
    transition: opacity 1s ease-in-out;

    svg {
        width: 6.75rem;
        height: 6.75rem;

        path:nth-child(1), path:nth-child(2), path:nth-child(4) {
            opacity: 0;
        }
    }

    &.pulsing svg {
        path:nth-child(1), path:nth-child(2), path:nth-child(4) {
            animation: fastwave 1s ease alternate infinite;
        }
        path:nth-child(1) {
            animation-delay: .5s;
        }
        path:nth-child(2) {
            animation-delay: .7s;
        }
        path:nth-child(4) {
            animation-delay: .9s;
        }
    }

    &.disabled {
        svg {
            animation: initial;
            path:nth-child(1), path:nth-child(2), path:nth-child(4) {
                animation: initial;
                opacity: 0;
            }
        }
    }
    &.inverse {
        cursor: initial;
        path:nth-child(1), path:nth-child(2), path:nth-child(4) {
            stroke: white;
        }
    }
}

.tooltip.staking-feature-tip {
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
