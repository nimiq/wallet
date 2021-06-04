<template>
    <div>
        <PageHeader>
            <template #default>
                <div class="staking-icon">
                    <StakingHeroIcon />
                </div>
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
                <div class="staking-icons-lace" :class="{ necklace: ENABLED.necklace }">
                    <img v-for="(icon, index) in orderOfValidators"
                        :key="index"
                        :src="`/img/staking/providers/${icon}`"
                        :style="{
                            top: `${((Math.sin((index + 1) * (Math.PI / 10))) * 25)
                            + (ENABLED.necklace ? progression(index, orderOfValidators.length)*28 : 0)}px`,
                            width: ENABLED.necklace?`${progression(index, orderOfValidators.length) * 7.0}rem`:'',
                            height: ENABLED.necklace?`${progression(index, orderOfValidators.length) * 7.0}rem`:'',
                        }"
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
import { ENABLED_FEATURES as ENABLED } from '../widgets/DevBar.vue';
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
            ENABLED,
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
    .page-header {
        height: 36.625rem;
        padding-top: 3rem;
        line-height: 1;
        /deep/ .nq-h1 {
            font-size: 3rem;
            color: var(--nimiq-blue);
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
        height: 31rem;
        .staking-rounded-background {
            display: flex;
            flex-direction: column;
            justify-content: center;
            background-image: url('/img/staking/background-collar.svg');
            background-size: cover;
            background-position: 0rem -1rem;
            background-repeat: no-repeat;
            text-align: center;
            .staking-under-icons-text {
                font-size: 1.75rem;
                font-weight: 600;
                padding: 7.625rem 2rem;
                padding-bottom: 1.25rem;
                line-height: 2.45rem;
                text-align: center;
                color: #231044;
                opacity: 0.6;
                width: 95%;
                margin: auto;
            }
            .staking-icons-lace {
                position: relative;
                top: 3.0rem;
                left: -3.25rem;
                white-space: nowrap;
                width: 95%;
                margin: auto;
                &.necklace {
                    top: -3.5rem;
                    left: -2.5rem;
                }
                img {
                    position:relative;
                    width: 5.375rem;
                    height: 5.375rem;
                    margin-left: .81rem;
                }
            }
            .stake-button {
                height: 8rem;
                width: 31.5rem;
                font-weight: bold;
                font-size: 2rem;
                line-height: 2.5rem;
                letter-spacing: 0.1875rem;
            }
        }
    }

    .nq-text {
        display: inline-block;
        margin-top: 1.25rem;
        padding: 0rem 1rem;
        font-size: 2rem;
        font-weight: 400;
        line-height: 140%;
        color: #231044;
    }
</style>
