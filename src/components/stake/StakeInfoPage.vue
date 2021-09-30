<template>
    <div class="stake-info-page flex-column">
        <PageHeader>
            <template #default>
                <div class="staking-icon">
                    <StakingHeroIcon />
                </div>
                {{ $t('Stake NIM to earn NIM') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Help secure the network by locking up NIM and get a percentage as a reward.') }}
                </p>
            </template>
        </PageHeader>
        <PageBody>
            <div class="staking-rounded-background flex-column">
                <div class="staking-icons-lace">
                    <img v-for="(icon, index) in orderOfValidators"
                        :key="index"
                        :src="`/img/staking/providers/${icon}`"
                        :style="{top: `${((Math.sin((index + 1) * (Math.PI / 10))) * 20)}px`}"
                    />
                </div>
                <div class="staking-under-icons-text">
                    {{ $t('So called validators facilitate this process.'
                        + ' Choose one to stake on your behalf, set an amount and go.') }}
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
import { ValidatorData } from '../../stores/Staking';
import StakingHeroIcon from '../icons/Staking/StakingHeroIcon.vue';

const progression = (i:number, n:number) => {
    if (n % 2 === 0) {
        throw new Error('Invalid progression scale(not an odd number)!');
    }
    const leg = (n - 1) / 2.0;
    const d = Math.max(0, (i >= leg) ? ((leg + 1) - (n - i)) : (leg - i)) / n;
    return 1.0 - d;
};

export default defineComponent({
    setup(props) {
        const sortedSequence = props.validatorsList.sort((a, b) => b.trust - a.trust).map(
            (validator: ValidatorData) => validator.icon,
        );
        return {
            progression,
            orderOfValidators: sortedSequence.reverse().concat(
                sortedSequence.filter((item, index) => (index > 0)),
            ),
        };
    },
    props: {
        validatorsList: {
            type: Array as () => ValidatorData[],
            required: true,
        },
    },
    components: {
        PageHeader,
        PageBody,
        StakingHeroIcon,
    },
});
</script>

<style lang="scss" scoped>
    .stake-info-page {
        flex-grow: 1;
    }

    .page-header {
        height: 36.625rem;
        padding-top: 3rem;
        line-height: 1;

        /deep/ .nq-h1 {
            font-size: var(--h1-size);
        }
        .staking-icon {
            margin-top: .75rem;
            margin-left: -.125rem;
            margin-bottom: 2.375rem;
            svg {
                height: 17.375rem;
            }
        }
    }
    .page-body {
        padding: 0;
        margin: 0;
        flex-grow: 1;

        .staking-rounded-background {
            background-image: url('/img/staking/background-collar.svg');
            background-size: cover;
            background-position: 0rem -1rem;
            background-repeat: no-repeat;
            padding-bottom: 2rem;
            height: 100%;

            .staking-icons-lace {
                position: relative;
                left: -2rem;
                margin-top: 3rem;
                white-space: nowrap;
                flex-grow: 1;
                min-height: 9rem;

                img {
                    position: relative;
                    width: 5.375rem;
                    height: 5.375rem;
                    margin-left: .81rem;
                }
            }

            .staking-under-icons-text {
                font-size: var(--small-size);
                font-weight: 600;
                padding: 0 4rem;
                padding-bottom: 1.25rem;
                line-height: 2.45rem;
                text-align: center;
                color: var(--text-60);
            }

            .stake-button {
                width: 31.5rem;
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
                .staking-icons-lace {
                    margin-top: 2.5rem;
                    img {
                        margin-left: .65rem;
                        width: 4.75rem;
                        height: 4.75rem;
                    }
                }
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
