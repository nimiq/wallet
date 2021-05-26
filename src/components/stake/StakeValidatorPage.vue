<template>
    <div>
        <PageHeader :backArrow="true" @back="$emit('back')">
            <template #default>
                <br/>
                {{ $t('Choose a Validator') }}
            </template>
            <template #more>
                <span class="nq-text nq-blue">
                    {{ $t('Earn rewards by locking NIM in a validator. Locked NIM stay in your wallet.') }}
                </span>
            </template>
        </PageHeader>
        <PageBody>
            <StakeValidatorFilter />
            <div class="mask-container">
                <div class="scroll-mask-top"></div>
                <div class="scroll-container">
                    <div class="validator-list">
                        <StakeValidatorListItem
                            v-for="(validatorData, index) in list" :key="index"
                            :validatorData="validatorData"
                            :stakingData="stakingData"
                            :validatorsList="validatorsList"
                            :selectValidator="selectValidator"
                        />
                    </div>
                </div>
                <div class="scroll-mask-bottom"></div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { StakingData, ValidatorData, StakingScoringRules } from '../../stores/Staking';

import StakeValidatorFilter from './StakeValidatorFilter.vue';
import StakeValidatorListItem from './StakeValidatorListItem.vue';

export default defineComponent({
    setup(props) {
        console.log({ validatorsList: props.validatorsList });
        return {
            list: Array(3).fill(null)
                .reduce((o) => o.concat(props.validatorsList), []), // for mock data only
            selectValidator: props.setValidator,
        };
    },
    props: {
        validatorsList: {
            type: Array as () => ValidatorData>[],
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
        padding-top: .75rem;
        line-height: 1;
        height: 17rem;
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

        .validator-list {
            display: flex;
            flex-direction: column;
            width: 100%;
            padding-top: 1rem;
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: .75rem;
        margin-bottom: .25rem;
    }
</style>
