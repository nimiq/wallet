<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="stake-modal" :class="{
        'fat-modal': (page >= 3),
        'bluetailed-modal': (page === 1),
        }"
        :showOverlay="page === 2 && invalidAccount"
        >
        <template v-if="page === 1">
            <StakeInfoPage @next="page += 1" />
        </template>
        <template v-if="page === 2">
            <StakeValidatorPage @back="page += isStaking ? 2 : -1" @next="page += isStaking ? 2 : 1"/>
        </template>
        <template v-if="page === 3">
            <StakeGraphPage @back="page += isStaking ? 1 : -1" @next="page += 1" />
        </template>
        <template v-if="page === 4">
            <StakedAlreadyPage @back="page -= 1" @next="page += 1"
                @adjust-stake="adjustStake"
                @switch-validator="switchValidator" />
        </template>
        <template v-if="page === 5">
            <StakeRewardsHistoryPage @back="page -= 1" @next="page += 1" />
        </template>
        <SelectAccountOverlay slot="overlay" />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import { useStakingStore } from '../../stores/Staking';
import { useAddressStore } from '../../stores/Address';
import Modal from '../modals/Modal.vue';
import StakeInfoPage from './StakeInfoPage.vue';
import StakeValidatorPage from './StakeValidatorPage.vue';
import StakeGraphPage from './StakeGraphPage.vue';
import StakedAlreadyPage from './StakedAlreadyPage.vue';
import StakeRewardsHistoryPage from './StakeRewardsHistoryPage.vue';
import SelectAccountOverlay from './SelectAccountOverlay.vue';

export default defineComponent({
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { activeValidator, activeStake } = useStakingStore();
        const page = ref(activeValidator.value ? 4 : 1);

        const invalidAccount = computed(() => activeAddressInfo.value
            ? !activeAddressInfo.value.balance
            : false);

        const adjustStake = () => {
            page.value = 3;
        };

        const switchValidator = () => {
            page.value = 2;
        };

        const isStaking = computed(() => activeStake.value && activeStake.value.balance);

        watch(activeStake, (stake) => {
            if (!stake) {
                page.value = 1;
            }
        }, { lazy: true });

        return {
            page,
            activeValidator,
            adjustStake,
            switchValidator,
            invalidAccount,
            isStaking,
        };
    },
    components: {
        Modal,
        StakeInfoPage,
        StakeValidatorPage,
        StakeGraphPage,
        StakedAlreadyPage,
        StakeRewardsHistoryPage,
        SelectAccountOverlay,
    },
});
</script>

<style lang="scss" scoped>
    // .modal ::v-deep .small-page {
    //     height: auto;
    //     overflow-y: auto;
    // }
    .modal {
        ::v-deep .wrapper {
            .small-page {
                overflow: hidden;
                min-width: 52.5rem;
                min-height: 70rem;
                .page-body {
                    overflow: hidden;
                }
            }
        }
        &.fat-modal {
            ::v-deep .small-page {
                width: 63.5rem;
                height: 74.875rem;
                // transition: width 1.5s ease-out;
            }
            // transition: width 0.75s ease-out;
        }
        &.bluetailed-modal {
            ::v-deep .small-page {
                background: linear-gradient(180deg, #FFF 0%, #FFF 96%, rgb(248, 248, 248) 96%, #FFF 100%);
            }
        }
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        .modal {
            ::v-deep .wrapper {
                .small-page {
                    overflow: hidden;
                    min-width: 45rem;
                    width: 45rem;
                    min-height: 65.25rem;
                }
            }
        }
    }
</style>
