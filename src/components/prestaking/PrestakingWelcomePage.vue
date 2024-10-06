<template>
    <div class="prestaking-welcome-page flex-column">
        <StepProgressBar :currentStep="currentStep" />

        <!-- Step 1 -->
        <template v-if="currentStep === 1">
            <PageHeader>
                <template #default>
                    {{ $t('Pre-stake your NIM!') }} <br/>
                    {{ $t('1000 NIM = 1 Giveaway point') }}
                </template>
                <template #more>
                    <p class="nq-text">
                        {{ $t('Collect points for the big giveaway and get a shiny Identicon upgrade \
                            – the more the better.') }}
                    </p>
                </template>
            </PageHeader>
            <PageBody>
                <div class="prestaking-content-container flex-column">
                    <div class="prestaking-cards">
                        <div class="card">
                            <img src="../../assets/prestaking/cards/bronze.png" alt="Guardian">
                        </div>
                        <div class="card">
                            <img src="../../assets/prestaking/cards/silver.png" alt="Protector">
                        </div>
                        <div class="card">
                            <img src="../../assets/prestaking/cards/gold.png" alt="Hero">
                        </div>
                    </div>
                    <button class="nq-button light-blue prestake-button" @click="nextStep">
                        {{ $t('Let\'s go') }}
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
                <div class="prestaking-content-container flex-column">
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
                <div class="prestaking-content-container flex-column">
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
import StepProgressBar from '../StepProgressBar.vue';

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
        StepProgressBar,
    },
});
</script>

<style lang="scss" scoped>
    @import '../../scss/variables.scss';
    @import '../../scss/functions.scss';

    .prestaking-welcome-page {
        flex-grow: 1;
        background: url('../../assets/prestaking/background.png') no-repeat center center;
        background-size: cover;
        background-color: nimiq-blue(1);
        border-radius: 0.75rem;
        position: relative;
        color: white;
        width: 62rem;
    }

    .page-header {
        padding-top: 9.5rem;
        padding-bottom: 6.25rem;
    }
    .page-body {
        padding: 0;
        margin: 0;
        flex-grow: 1;
        overflow: unset;

        .prestaking-content-container {
            justify-content: space-between;
            align-items: center;
            height: 100%;
            overflow: hidden; // Hide overflow on the container
        }

        .prestake-button {
            width: 31.5rem;
            margin: 0;
            margin-bottom: 5.75rem;
        }
    }

    .nq-text {
        margin: 1.25rem 0 0;
        padding: 0rem 1rem;
        color: white;
    }

    .prestaking-cards {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem; // 12px
        margin-bottom: 3rem; // 24px
        width: 115%;
    }

    .card {
        flex: 0 0 auto;
        width: 33.33%; // Each card takes up a third of the container width

        img {
            width: 100%;
            height: auto;
        }
    }

    @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
        .prestaking-welcome-page {
            width: 100%;
            margin-top: -.5rem;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
        }
    }
</style>
