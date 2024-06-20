<template>
    <div class="staking-button">
        <Tooltip
            v-if="asButton && visible && activeAddressInfo && activeAddressInfo.balance"
            class="staking-feature-tip"
            preferredPosition="bottom"
            :container="this.$parent">
            <div slot="trigger">
                <button class="stake"
                    :class="{
                        disabled: !activeAddressInfo || !activeAddressInfo.balance,
                        inverse: inversePalette,
                    }" @click="$router.push('/staking')"
                    @mousedown.prevent
                    :disabled="!activeAddressInfo || !activeAddressInfo.balance">
                    <HeroIcon :pulsing="!isAccountStaking" />
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
        const { activeStake, totalAccountStake } = useStakingStore();
        const visible = computed(() => !activeStake.value?.activeBalance);

        const isAccountStaking = computed(() => !!totalAccountStake.value);

        return {
            visible,
            activeAddressInfo,
            isAccountStaking,
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

    & ::v-deep svg {
        font-size: 6.75rem;
    }
}

.stake {
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

.tooltip.staking-feature-tip {
    ::v-deep .trigger::after {
        background-color: var(--nimiq-green);
        transform: translateY(-0.9rem);
    }

    ::v-deep .tooltip-box {
        background: var(--nimiq-green-bg);
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
