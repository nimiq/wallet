<template>
    <div>
        <PageHeader>
            <template #default>
                <StakingIcon/>
                <br/>
                {{ $t('Stake NIM to earn NIM') }}
            </template>
            <template #more>
                <span class="nq-text nq-blue">
                    {{ $t('Welcome to staking. Lock up funds with a validator and earn NIM free of risk.') }}
                </span>
            </template>
        </PageHeader>
        <PageBody>
            <ol class="staking-bullet-list">
                <li class="step-up">
                    <span class="step-number">1</span>
                    <span class="step-label">{{ $t('Select a validator') }}</span>
                </li>
                <li class="step-up">
                    <span class="step-number">2</span>
                    <span class="step-label">{{ $t('Choose an amount') }}</span>
                </li>
                <li>
                    <span class="step-number">3</span>
                    <span class="step-label">{{ $t('Start earning NIM') }}</span>
                </li>
            </ol>
            <button class="nq-button light-blue stake-button" @click="$emit('next')">{{ $t('let\'s go') }}</button>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import StakingIcon from '../icons/Staking/StakingIcon.vue';

export default defineComponent({
    components: {
        PageHeader,
        PageBody,
        StakingIcon,        
    },
});
</script>

<style lang="scss" scoped>
    .page-header {
        padding-top: 9rem;
        line-height: 1;
        .staking-icon {
            margin-left: 1rem;
            margin-bottom: 5.125rem;
        }
    }
    .page-body {
        margin-top: -1.75rem;
        padding-top: 0;
        padding-left: 7rem;
        .staking-bullet-list {
            padding-left: 0.5rem;
            font-size: 2rem;
            line-height: 140%;
            li {
                list-style: none;
                margin-bottom: 1.25rem;
            }
            .step-number {
                display: inline-block;
                padding-top: 0.375rem;
                padding-left: 1.25rem;
                width: 4rem;
                height: 4rem;
                border-radius: 50%;
                border: 1.5px solid rgba(31, 35, 72, 0.2);
            }
            .step-label {
                padding-left: 1.375rem;
                padding-top: 0.125rem;
            }
            .step-up {
                padding-bottom: 0.375rem;
            }
        }
        .stake-button {
            margin-top: 5.5rem;
            margin-left: 3.5rem;
            margin-bottom: -1rem;
            width: 32rem;
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1rem;
        font-size: 2rem;
    }
</style>