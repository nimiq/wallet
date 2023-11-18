<template>
    <div class="staking-button">
        <Tooltip
            v-if="asButton && visible"
            class="staking-feature-tip"
            :styles="{width: '25rem'}"
            preferredPosition="bottom left"
            :container="this.$parent">
            <div slot="trigger">
                <button class="stake"
                    :class="{
                        disabled: !activeAddressInfo || !activeAddressInfo.balance,
                        inverse: inversePalette,
                    }" @click="$router.push('/staking')"
                    @mousedown.prevent
                    :disabled="!activeAddressInfo || !activeAddressInfo.balance">
                    <HeroIcon />
                </button>
            </div>
            <span>
                {{ $t('Earn NIM every month by staking your NIM') }}
            </span>
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
import { defineComponent, computed } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';

import HeroIcon from '../icons/Staking/HeroIcon.vue';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeStake } = useStakingStore();
        const visible = computed(() => !activeStake.value?.activeBalance);

        return {
            visible,
            activeAddressInfo,
        };
    },
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
    components: {
        Tooltip,
        HeroIcon,
    },
});
</script>

<style lang="scss" scoped>
.staking-button {
    position: relative;

    &::v-deep .tooltip {
        position: absolute;
        right: 0;
        top: -1.5rem;
    }
}

.stake {
    display: block;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
    transition: opacity 1s ease-in-out;

    svg {
        width: 6.75rem;
        height: 6.75rem;

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
    z-index: 3;
    ::v-deep .trigger::after {
        background-color: var(--nimiq-green);
    }

    ::v-deep .tooltip-box {
        background: var(--nimiq-green-bg);
        color: white;
        font-size: 1.75rem;
        font-weight: bold;
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
