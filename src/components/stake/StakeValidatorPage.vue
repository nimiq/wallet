<template>
    <div>
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                {{ $t('Choose a Validator') }}
            </template>
            <template #more>
                <span class="nq-text nq-blue">
                    {{ $t('Earn rewards by locking NIM in a validator. Locked NIM stay in your wallet.') }}
                </span>
            </template>
        </PageHeader>
        <PageBody>
            <StakeValidatorFilter @changed="doSort"/>
            <div class="mask-container">
                <div class="scroll-mask-top" :class="{ 'disabled-mask': !masks }"></div>
                <div class="scroll-container">
                    <div class="validator-list">
                        <StakeValidatorListItem
                            v-for="(validatorData, index) in sortedList" :key="index"
                            :validatorData="validatorData"
                            :stakingData="stakingData"
                            :validatorsList="validatorsList"
                            :selectValidator="selectValidator"
                            @focus="onValidatorFocusChange"
                        />
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
import { StakingData, ValidatorData } from '../../stores/Staking';// StakingScoringRules

import StakeValidatorFilter, { FilterState } from './StakeValidatorFilter.vue';
import StakeValidatorListItem from './StakeValidatorListItem.vue';

export default defineComponent({
    setup(props) {
        const masks = ref(true);
        const onValidatorFocusChange = (state:boolean) => {
            masks.value = !state;
        };
        const sortedList = ref(props.validatorsList.map((i) => i));
        const doSort = (state: FilterState) => {
            // console.log(state, FilterState.TRUST);
            switch (state) {
                case FilterState.TRUST: {
                    sortedList.value.sort((a, b) => (a.trust < b.trust)
                        ? 1
                        : ((a.trust > b.trust)
                            ? -1
                            : 0),
                    );
                    break;
                }
                case FilterState.PAYOUT: {
                    sortedList.value.sort((a, b) => (a.payout < b.payout)
                        ? 1
                        : ((a.payout > b.payout)
                            ? -1
                            : 0),
                    );
                    break;
                }
                case FilterState.REWARD: {
                    sortedList.value.sort((a, b) => (a.reward < b.reward)
                        ? 1
                        : ((a.reward > b.reward)
                            ? -1
                            : 0),
                    );
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

    .page-header {
        padding-top: .5rem;
        margin-left: -.25rem;
        line-height: 1;
        height: 17rem;
        /deep/ .nq-h1 {
            color: var(--nimiq-blue);
            padding-top: 3.25rem;
            font-size: 3rem;
        }
    }
    .page-body {
        padding-top: 0;
        padding-left: 1rem;
        padding-right: 0;
        max-height: 51.25rem;
        overflow: hidden;

        .mask-container {
            position: relative;
            overflow: hidden;
        }

        .scroll-container {
            overflow-y: auto;
            height: 45.75rem;
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
            padding-top: 1rem;
        }
    }
    .nq-text {
        display: inline-block;
        margin-top: .875rem;
        margin-bottom: .25rem;
        font-size: 2rem;
        line-height: 140%;
        color: var(--nimiq-blue);
    }
</style>
