<template>
    <div class="staking-welcome-page flex-column">
        <PageHeader>
            <template #default>
                <div class="staking-icon">
                    <HeroIcon />
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
            <div class="staking-rounded-background flex-column">
                <div class="staking-under-icons-text">
                    {{ $t('Prestaked funds are locked until launch') }}
                </div>
                <button class="nq-button light-blue stake-button" @click="$emit('next')">
                    {{ $t('Let\'s go') }}
                </button>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import HeroIcon from '../icons/Staking/HeroIcon.vue';

export default defineComponent({
    setup() {
        return {};
    },
    components: {
        PageHeader,
        PageBody,
        HeroIcon,
    },
});
</script>

<style lang="scss" scoped>
    .staking-welcome-page {
        flex-grow: 1;
        background-image: url('../../assets/staking/staking-welcome-background.svg');
        background-size: cover;
    }

    .page-header {
        padding-top: 9.5rem;
        padding-bottom: 6.25rem;
        line-height: 1;

        ::v-deep .nq-h1 {
            font-size: var(--h1-size);
        }
        .staking-icon {
            margin-bottom: 5rem;

            svg {
                height: 17.375rem;
            }
        }
    }
    .page-body {
        padding: 0;
        margin: 0;
        padding-bottom: 5.75rem;
        flex-grow: 1;
        overflow: hidden;

        .staking-rounded-background {
            justify-content: space-between;
            align-items: center;
            height: 100%;

            .staking-under-icons-text {
                font-size: var(--small-size);
                font-weight: 600;
                padding: 0 4rem;
                padding-bottom: 1.25rem;
                line-height: 2.45rem;
                text-align: center;
                color: var(--nimiq-orange);
            }

            .stake-button {
                width: 31.5rem;
                margin: 0;
            }
        }
    }

    .nq-text {
        margin: 1.25rem 0 0;
        padding: 0rem 1rem;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        .page-header {
            .staking-icon {
                margin-top: 1.375rem;
                margin-bottom: 1.25rem;
                svg {
                    margin-left: 0.25rem;
                    height: 16rem;
                }
            }
        }

        .page-body {
            .staking-rounded-background {
                .staking-under-icons-text {
                    padding-bottom: .25rem;
                }
            }
        }
        .nq-text {
            margin: 1rem 0 0;
        }
    }
</style>
