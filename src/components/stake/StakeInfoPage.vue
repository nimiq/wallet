<template>
    <div>
        <PageHeader>
            <template #default>
                <span class="staking-icon">
                    <StakingHeroIcon />
                </span>
                <br/>
                {{ $t('Stake NIM to earn NIM') }}
            </template>
            <template #more>
                <span class="nq-text nq-blue">
                    {{ $t('Help secure the network by locking up NIM and get a percentage as a reward.') }}
                </span>
            </template>
        </PageHeader>
        <PageBody>
            <div class="staking-rounded-background">
                <div class="staking-icons-lace">
                    <img v-for="(icon, index) in orderOfValidators"
                        :key="index"
                        :src="`/img/staking/providers/${icon}`"
                        :style="{ top: `${Math.sin((index + 1) * (Math.PI / 10)) * 25}px` }"
                    />
                </div>
                <div class="staking-under-icons-text">
                    {{ $t('So called validators facilitate this process.'
                        + ' Choose one to stake on your behalf, set an amount and go.') }}
                </div>
                <button class="nq-button light-blue stake-button" @click="$emit('next')">
                    {{ $t('let\'s go') }}
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

export default defineComponent({
    setup(props) {
        const sortedSequence = props.validatorsList.sort((a, b) => b.trust - a.trust).map(
            (validator: ValidatorData) => validator.icon,
        );
        return {
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
    .page-header {
        padding-top: 9rem;
        line-height: 1;
        .staking-icon {
            margin-left: 1rem;
            margin-bottom: 5.125rem;
            svg {
                height: 16.584rem;
            //     line, path {
            //         stroke: var(--nimiq-green);
            //         stroke-width: 0.75;
            //     }
            }
        }
    }
    .page-body {
        margin-top: -1.75rem;
        padding: 0;
        margin: 0;
        height: 32rem;
        .staking-rounded-background {
            display: flex;
            flex-direction: column;
            justify-content: center;
            background-image: url('/img/staking/background-collar.svg');
            background-size: 350%;
            background-position: 0rem -15rem;
            background-repeat: no-repeat;
            text-align: center;
            width: 95%;
            margin: auto;
            .staking-under-icons-text {
                font-size: 1.75rem;
                font-weight: 600;
                padding: 3rem 2rem;
                line-height: 2.45rem;
                text-align: center;
                color: #231044;
                opacity: 0.6;
            }
            .staking-icons-lace {
                position: relative;
                top: -1.0rem;
                left: -3.0rem;
                white-space: nowrap;
                img {
                    position:relative;
                    width: 5.375rem;
                    height: 5.375rem;
                    margin-left: .75rem;
                }
            }
            // .staking-bullet-list {
            //     padding-left: 0.5rem;
            //     font-size: 2rem;
            //     line-height: 140%;
            //     li {
            //         list-style: none;
            //         margin-bottom: 1.25rem;
            //     }
            //     .step-number {
            //         display: inline-block;
            //         padding-top: 0.375rem;
            //         padding-left: 1.25rem;
            //         width: 4rem;
            //         height: 4rem;
            //         border-radius: 50%;
            //         border: 1.5px solid rgba(31, 35, 72, 0.2);
            //     }
            //     .step-label {
            //         padding-left: 1.375rem;
            //         padding-top: 0.125rem;
            //     }
            //     .step-up {
            //         padding-bottom: 0.375rem;
            //     }
            // }
            .stake-button {
                height: 8rem;
                width: 31.5rem;
            }
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1rem;
        font-size: 2rem;
    }
</style>
