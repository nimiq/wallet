<template>
    <Tooltip
        v-if="visible && activeCurrency === 'nim'"
        class="staking-feature-tip"
        preferredPosition="bottom left"
        :container="this.$parent">
        <div slot="trigger">
            <button class="stake"
                :class="{ stackattack: stackattack }" @click="$router.push('/stake')"
                @mousedown.prevent
                :disabled="!activeAddressInfo || !activeAddressInfo.balance">
                <StakingHeroIcon />
            </button>
        </div>
        <span>
            {{ $t('Earn ~304 NIM a month by staking your NIM') }}
        </span>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import { useAddressStore } from '../../../stores/Address';
import { useAccountStore } from '../../../stores/Account';
import { useStakingStore } from '../../../stores/Staking';
import { ENABLED_FEATURES as ENABLED } from '../../widgets/DevBar.vue';

import StakingHeroIcon from '../../icons/Staking/StakingHeroIcon.vue';

export default defineComponent({
    setup() {
        const stackattack = computed(() => ENABLED.stackattack);
        const { activeAddressInfo } = useAddressStore();
        const { activeCurrency } = useAccountStore();
        const { activeValidator } = useStakingStore();
        const validator = activeValidator;
        const visible = computed(() => !validator.value || validator.value.stakedAmount === 0);

        return {
            visible,
            stackattack,
            activeCurrency,
            activeAddressInfo,
        };
    },
    components: {
        Tooltip,
        StakingHeroIcon,
    },
});
</script>

<style lang="scss" scoped>
.stake {
    background-color: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
    margin-left: 0.5rem;
    transition: opacity 1s ease-in-out;
    svg {
        width: 6.75rem;
        height: 6.75rem;
    }
    &.stackattack {
        svg {
            animation: flicker 15s ease alternate infinite;
            path:nth-child(1), path:nth-child(2), path:nth-child(4) {
                animation: fastwave 3s ease alternate infinite;
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
    }
}
</style>
