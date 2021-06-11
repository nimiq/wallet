<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="stake-modal" :class="{
        'fat-modal': (page >= 3),
        'bluetailed-modal': (page === 1),
    }">
        <template v-if="page === 1">
            <StakeInfoPage @next="page += 1"
                :validatorsList="validatorsList" />
        </template>
        <template v-if="page === 2">
            <StakeValidatorPage @back="page -= 1" @next="page += 1"
                :stakingData="stakingData" :validatorsList="validatorsList"
                :setValidator="setValidator" />
        </template>
        <template v-if="page === 3">
            <StakeGraphPage @back="page -= 1" @next="page += 1"
                :stakingData="stakingData" :validatorsList="validatorsList"
                :activeValidator="activeValidator" />
        </template>
        <template v-if="page === 4">
            <StakedAlreadyPage @back="page -= 1" @next="page += 1"
                @adjust-stake="adjustStake"
                @switch-validator="switchValidator"
                :stakingData="stakingData" :validatorsList="validatorsList"
                :activeValidator="activeValidator" />
        </template>
        <template v-if="page === 5">
            <StakeRewardsHistoryPage @back="page -= 1" @next="page += 1"
                :stakingData="stakingData" :validatorsList="validatorsList"
                :activeValidator="activeValidator" />
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from '@vue/composition-api';
import { useStakingStore, ValidatorData, StakingData, StakingScoringRules } from '../../stores/Staking';
import { i18n } from '../../i18n/i18n-setup';
import Modal from '../modals/Modal.vue';
import StakeInfoPage from './StakeInfoPage.vue';
import StakeValidatorPage from './StakeValidatorPage.vue';
import StakeGraphPage from './StakeGraphPage.vue';
import StakedAlreadyPage from './StakedAlreadyPage.vue';
import StakeRewardsHistoryPage from './StakeRewardsHistoryPage.vue';

import stakingData from './assets/staking.json';
import validatorsList from './assets/validators.mock.json';// mock data

export default defineComponent({
    setup() {
        const { activeValidator, selectValidator } = useStakingStore();
        const page = ref(activeValidator.value ? 4 : 1);

        const setValidator = (validator: ValidatorData) => {
            selectValidator(validator);
            page.value = 3;
        };

        const adjustStake = () => {
            page.value = 3;
        };

        const switchValidator = () => {
            page.value = 2;
        };

        return {
            page,
            setValidator,
            activeValidator,
            adjustStake,
            switchValidator,
            stakingData: computed(() => Object.fromEntries(
                Object.entries(stakingData as StakingData).map(([k, v]) => {
                    if (k.endsWith('Rules')) {
                        return [k, (v as StakingScoringRules).map(
                            (rule: Array<string>) => rule.slice(0, -1).concat([
                                i18n.t(rule.slice(-1)[0]).toString(),
                            ]),
                        )];
                    }
                    return [k, i18n.t(v as string).toString()];
                }),
            )),
            validatorsList: computed(() => validatorsList),
        };
    },
    components: {
        Modal,
        StakeInfoPage,
        StakeValidatorPage,
        StakeGraphPage,
        StakedAlreadyPage,
        StakeRewardsHistoryPage,
    },
});
</script>

<style lang="scss" scoped>
    // .modal /deep/ .small-page {
    //     height: auto;
    //     overflow-y: auto;
    // }
    .modal {
        /deep/ .wrapper {
            .small-page {
                overflow: hidden;
                min-width: 52.5rem;
                min-height: 70rem;
                .page-body {
                    overflow: hidden;
                }
            }
        }
        /deep/ .page-header-back-button {
            margin-top: 3.25rem;
            margin-left: 1rem;
        }
        &.fat-modal {
            /deep/ .small-page {
                width: 63.5rem;
                height: 74.875rem;
                // transition: width 1.5s ease-out;
            }
            // transition: width 0.75s ease-out;
        }
        &.bluetailed-modal {
            /deep/ .small-page {
                background: linear-gradient(180deg, #FFF 0%, #FFF 96%, rgb(248, 248, 248) 96%, #FFF 100%);
            }
        }
    }
</style>
