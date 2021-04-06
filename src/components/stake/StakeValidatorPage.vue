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
            <div class="validator-list">
                <StakeValidatorListItem
                    v-for="(validatorData, index) in validatorsList" :key="index"
                    :validatorData="validatorData"
                />
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';

import StakeValidatorFilter from './StakeValidatorFilter.vue';
import StakeValidatorListItem from './StakeValidatorListItem.vue';

import validatorsList from './assets/validators.mock.json';// mock data

export default defineComponent({
    setup() {
        return {
            validatorsList: Array(3).fill(null)
                .reduce((o) => o.concat(validatorsList), []), // for mock data only
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

    .page-header {
        padding-top: .75rem;
        line-height: 1;
        height: 18rem;
    }
    .page-body {
        margin-top: -.25rem;
        padding-top: 0;
        padding-left: 1rem;
        padding-right: 0;
        max-height: 51.25rem;
        overflow-x: hidden;
        overflow-y: hidden;

        .validator-list {
            display: flex;
            flex-direction: column;
            position: relative;
            overflow-y: auto;
            max-height: 45.75rem;
            width: 100%;
            padding-top: 0.25rem;

            @extend %custom-scrollbar;
            scrollbar-color: #bcbec9 rgba(0, 0, 0, 0);
            scrollbar-width: 1rem;

            &::-webkit-scrollbar {
                width: 1rem;
            }

            &::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0);
            }
            &::-webkit-scrollbar-thumb {
                background-color: #bcbec9;
            }
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1rem;
        margin-bottom: .25rem;
        font-size: 2rem;
    }
</style>
