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
                <div class="content flex-column">
                    <div class="cards">
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
                    <button class="nq-button light-blue next-button" @click="nextStep">
                        {{ $t('Let\'s go!') }}
                    </button>
                </div>
            </PageBody>
        </template>

        <!-- Step 2 -->
        <template v-if="currentStep === 2">
            <PageHeader>
                <template #default>
                    {{ $t('Stake early to get more points!') }}
                </template>
                <template #more>
                    <p class="nq-text">
                        {{ $t('Pre-stake as early as possible to earn more points.') }}
                    </p>
                </template>
            </PageHeader>
            <PageBody>
                <div class="content flex-column">
                    <div class="icon-container">
                        <img src="../../assets/prestaking/step-2-icon.svg" alt="Hourglass icon"/>
                        <div class="icon-label">{{ $t('EARLY BIRD MULTIPLIERS') }}</div>
                    </div>
                    <div class="multipliers">
                        <div class="multiplier-card">
                            <div class="multiplier">{{ $t('3x') }}</div>
                            <div class="period">{{ $t('First week') }}</div>
                        </div>
                        <div class="multiplier-card">
                            <div class="multiplier">{{ $t('2x') }}</div>
                            <div class="period">{{ $t('Second week') }}</div>
                        </div>
                    </div>
                    <button class="nq-button light-blue next-button" @click="nextStep">
                        {{ $t('Let\'s go!') }}
                    </button>
                </div>
            </PageBody>
        </template>

        <!-- Step 3 -->
        <template v-if="currentStep === 3">
            <PageHeader>
                <template #default>
                    {{ $t('Go for small validator pools to earn even more points!') }}
                </template>
                <template #more>
                    <p class="nq-text">
                        {{ $t('Spreading the pre-staked NIM across validators helps decentralization.\
                        Choose an underdog for another bonus.') }}
                    </p>
                </template>
            </PageHeader>
            <PageBody>
                <div class="content flex-column">
                    <div class="icon-container">
                        <img src="../../assets/prestaking/step-3-icon.svg" alt="Hourglass icon"/>
                        <div class="icon-label">{{ $t('UNDERDOG MULTIPLIERS') }}</div>
                    </div>
                    <div class="multipliers">
                        <div class="multiplier-card step-3">
                            <div class="multiplier">{{ $t('5x') }}</div>
                            <div class="period">{{ $t('Small validators') }}</div>
                        </div>
                    </div>
                    <button class="nq-button light-blue next-button" @click="nextStep">
                        {{ $t('Let\'s go!') }}
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
        background: url('../../assets/prestaking/background.png') no-repeat bottom center;
        background-size: 100% auto;
        background-color: nimiq-blue(1);
        border-radius: 0.75rem;
        position: relative;
        color: white;
        width: 62rem;
    }

    .page-header {
        padding-top: 4rem;
        padding-bottom: 7rem;
    }

    .page-body {
        padding: 0;
        margin: 0;
        flex-grow: 1;
        overflow: unset;

        .content {
            justify-content: space-between;
            align-items: center;
            height: 100%;
            overflow: hidden; // Hide overflow on the container
        }

        .next-button {
            width: 40.875rem;
            margin: 0;
            margin-bottom: 5.375rem;
        }
    }

    .nq-text {
        margin: 1.25rem 0 0;
        padding: 0rem 1rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .icon-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 2rem;

        img {
            height: 150px;
            width: auto;
            margin-bottom: 2rem;
        }

        .icon-label {
            font-size: 1.5rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.6);
            text-transform: uppercase;
            // letter-spacing: 0.0625rem;
        }
    }

    .cards {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1.5rem; // 12px
        margin-bottom: 5rem;
        width: 115%;

        .card {
            flex: 0 0 auto;
            width: 33.33%; // Each card takes up a third of the container width

            img {
                width: 100%;
                height: auto;
            }
        }
    }

    .multipliers {
        display: flex;
        justify-content: center;
        gap: 1.5rem; // 12px
        margin-bottom: 8.375rem;
    }

    .multiplier-card {
        border-radius: 1rem;
        padding: 2.5rem;

        width: 162px;
        height: 80px;

        &.step-3 {
            width: 210px;
        }

        display: flex;
        flex-direction: row;
        align-items: center;

        // figma
        border: 1.5px solid rgba(255, 255, 255, 0.4);
        background-blend-mode: color-dodge;
        background: radial-gradient(101.48% 101.48% at 50% 100%, rgba(31, 35, 72, 0) 0%, rgba(31, 35, 72, 0.15) 100%);
        background: radial-gradient(83.64% 49.88% at 50% 0%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
        background-color: rgba(255, 255, 255, 0.05);
        // border-image-source: linear-gradient(0deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2)),
        //     radial-gradient(50% 100% at 50% 0%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 100%);
    }

    .multiplier {
        font-size: 2rem;
        font-weight: 600;
        padding: 1rem;
        margin-right: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
    }

    .period {
        font-size: 2rem;
        line-height: 1.25;
        opacity: 0.6;
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
