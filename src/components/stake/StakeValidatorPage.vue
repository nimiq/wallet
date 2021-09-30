<template>
    <div class="stake-validator-page flex-column">
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Choose a Validator') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Earn rewards by locking NIM in a validator. Locked NIM stay in your wallet.') }}
                </p>
            </template>
        </PageHeader>
        <PageBody>
            <StakeValidatorFilter @changed="doSort" />
            <div class="mask-container">
                <div class="scroll-mask-top" :class="{ 'disabled-mask': !masks }"></div>
                <div class="scroll-container">
                    <div class="validator-list">
                        <StakeValidatorListItem
                            v-for="validatorData in sortedList" :key="validatorData.name"
                            :prop="validatorData.name"
                            :validatorData="validatorData"
                            :stakingData="stakingData"
                            :validatorsList="validatorsList"
                            @click.native="selectValidator(validatorData)"
                            @focus="onValidatorFocusChange"
                            sortable
                        />
                        <div style="height: 1rem; flex-shrink: 0;"></div>
                    </div>
                </div>
                <div class="scroll-mask-bottom" :class="{ 'disabled-mask': !masks }"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { StakingData, ValidatorData } from '../../stores/Staking';

import StakeValidatorFilter, { FilterState } from './StakeValidatorFilter.vue';
import StakeValidatorListItem from './StakeValidatorListItem.vue';

export default defineComponent({
    props: {
        validatorsList: {
            type: Array as () => ValidatorData[],
            required: true,
        },
        stakingData: {
            type: Object as () => StakingData,
            required: true,
        },
        setValidator: {
            type: Function as () => unknown,
            required: true,
        },
    },
    setup(props) {
        const masks = ref(true);
        const onValidatorFocusChange = (state:boolean) => {
            masks.value = !state;
        };
        const sortedList = ref(props.validatorsList.slice());
        const doSort = (state: FilterState) => {
            switch (state) {
                case FilterState.TRUST: {
                    sortedList.value.sort((a, b) => b.trust - a.trust);
                    break;
                }
                case FilterState.PAYOUT: {
                    sortedList.value.sort((a, b) => a.payout - b.payout);
                    break;
                }
                case FilterState.REWARD: {
                    sortedList.value.sort((a, b) => b.reward - a.reward);
                    break;
                }
                default: {
                    //
                }
            }
        };

        return {
            masks,
            sortedList,
            selectValidator: props.setValidator,
            onValidatorFocusChange,
            doSort,
        };
    },
    components: {
        PageHeader,
        PageBody,
        StakeValidatorListItem,
        StakeValidatorFilter,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/mixins.scss';

    .stake-validator-page {
        flex-grow: 1;
    }

    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        padding: 1rem 0;
        overflow: hidden;

        .mask-container {
            position: relative;
            top: -.75rem;
            overflow: hidden;
            padding-top: .75rem;
        }

        .scroll-container {
            overflow-y: auto;
            @extend %custom-scrollbar;
            &::-webkit-scrollbar {
                width: 0.75rem;
            }
            scrollbar-width: thin;
        }

        .scroll-mask-top {
            position: absolute;
            top: 0;
            left: 0.875rem;
            width: calc(100% - 2.25rem);
            height: 2.5rem;
            background: linear-gradient(0deg, rgba(244, 244, 244, 0), white);
        }

        .scroll-mask-bottom {
            position: absolute;
            left: 0.875rem;
            bottom: 0;
            width: calc(100% - 2.25rem);
            height: 2.5rem;
            background: linear-gradient(0deg, white, rgba(244, 244, 244, 0));
        }

        .disabled-mask {
            background: none;
        }

        .validator-list {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 46.5rem;
            padding-top: 1rem;
        }
    }
    .nq-text {
        margin-top: .875rem;
        margin-bottom: 0.5rem;
        line-height: 1.4;
    }

    @media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    }

    @media (max-width: 700px) { // Full mobile breakpoint
    }
</style>
