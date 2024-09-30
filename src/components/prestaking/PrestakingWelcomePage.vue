<template>
    <div class="prestaking-welcome-page flex-column">
        <!-- Step 1 -->
        <template v-if="currentStep === 1">
            <PageHeader>
                <template #default>
                    <div class="two-leaf-staking-icon">
                        <HeroIcon pulsing />
                    </div>
                    {{ $t('Lock NIM for Proof of Stake') }}
                </template>
                <template #more>
                    <p class="nq-text nq-blue">
                        {{ $t('Prestaking NIM secures the network and is the quickest way to staking rewards.') }}
                    </p>
                </template>
            </PageHeader>
            <PageBody>
                <div class="prestaking-rounded-background flex-column">
                    <div class="prestaking-under-icons-text">
                        <PrestakingNotice theme="warning"/>
                    </div>
                    <button class="nq-button light-blue prestake-button" @click="nextStep">
                        {{ $t('Next') }}
                    </button>
                </div>
            </PageBody>
        </template>

        <!-- Step 2 -->
        <template v-if="currentStep === 2">
            <PageHeader>
                <template #default>
                    {{ $t('Step 2 Header') }}
                </template>
                <template #more>
                    <p class="nq-text nq-blue">
                        {{ $t('Step 2 subheader text goes here.') }}
                    </p>
                </template>
            </PageHeader>
            <PageBody>
                <div class="prestaking-rounded-background flex-column">
                    <div class="prestaking-under-icons-text">
                        {{ $t('Step 2 content goes here') }}
                    </div>
                    <button class="nq-button light-blue prestake-button" @click="nextStep">
                        {{ $t('Next') }}
                    </button>
                </div>
            </PageBody>
        </template>

        <!-- Step 3 -->
        <template v-if="currentStep === 3">
            <PageHeader>
                <template #default>
                    {{ $t('Step 3 Header') }}
                </template>
                <template #more>
                    <p class="nq-text nq-blue">
                        {{ $t('Step 3 subheader text goes here.') }}
                    </p>
                </template>
            </PageHeader>
            <PageBody>
                <div class="prestaking-rounded-background flex-column">
                    <div class="prestaking-under-icons-text">
                        {{ $t('Step 3 content goes here') }}
                    </div>
                    <button class="nq-button light-blue prestake-button" @click="nextStep">
                        {{ $t('Let\'s go') }}
                    </button>
                </div>
            </PageBody>
        </template>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import HeroIcon from '../icons/Prestaking/HeroIcon.vue';
import PrestakingNotice from './PrestakingNotice.vue';

export default defineComponent({
    setup(props, { emit }) {
        const currentStep = ref(1);

        const nextStep = () => {
            if (currentStep.value < 3) {
                currentStep.value++;
            } else {
                emit('next');
            }
        };

        return {
            currentStep,
            nextStep,
        };
    },
    components: {
        PageHeader,
        PageBody,
        HeroIcon,
        PrestakingNotice,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/variables.scss';

    .prestaking-welcome-page {
        flex-grow: 1;
        background-image: url('../../assets/prestaking/prestaking-welcome-background.svg');
        background-size: cover;
    }

    .page-header {
        padding-top: 9.5rem;
        padding-bottom: 6.25rem;
        line-height: 1;

        ::v-deep .nq-h1 {
            font-size: var(--h1-size);
        }
        .two-leaf-staking-icon {
            margin-bottom: 5rem;
            font-size: 17rem;

            & ::v-deep svg {
                font-size: 17.375rem;
                margin: 0 auto;
            }
        }
    }
    .page-body {
        padding: 0;
        margin: 0;
        padding-bottom: 5.75rem;
        flex-grow: 1;
        overflow: unset;

        .prestaking-rounded-background {
            justify-content: space-between;
            align-items: center;
            height: 100%;

            .prestaking-under-icons-text {
                font-size: var(--small-size);
                font-weight: 600;
                padding: 0 4rem;
                padding-bottom: 1.25rem;
                line-height: 2.45rem;
                text-align: center;
                color: var(--nimiq-orange);
            }

            .prestake-button {
                width: 31.5rem;
                margin: 0;
            }
        }
    }

    .nq-text {
        margin: 1.25rem 0 0;
        padding: 0rem 1rem;
    }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
        .page-header {
            .two-leaf-staking-icon {
                & ::v-deep svg {
                    height: 16rem;
                }
            }
        }

        .page-body {
            .prestaking-rounded-background {
                .prestaking-under-icons-text {
                    margin-bottom: 1rem;
                }
            }
        }
        .nq-text {
            margin: 1rem 0 0;
        }
    }
</style>
