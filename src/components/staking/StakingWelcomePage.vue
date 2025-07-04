<template>
    <div class="staking-welcome-page flex-column">
        <PageHeader>
            <template #default>
                <div class="staking-icon">
                    <StakingIcon pulsing />
                </div>
                {{ $t('Stake NIM to earn NIM') }}
            </template>
            <template #more>
                <p class="nq-text nq-blue">
                    {{ $t('Lock up NIM to support the network and earn new NIM as a reward.') }}
                </p>
            </template>
        </PageHeader>
        <PageBody>
            <div class="staking-rounded-background flex-column">
                <div class="staking-icons-lace">
                    <template v-for="(validator, index) in validators">
                        <ValidatorIcon v-if="validator"
                            :validator="validator" :key="index"
                            :style="{ top: getTopPosition(index) }"
                        />
                        <HexagonIcon v-else :key="index"
                            :style="{ top: getTopPosition(index), '--delay': `${index * 100}ms` }"/>
                    </template>
                </div>
                <div class="staking-under-icons-text">
                    {{ $t('For a small fee, validator pools do the staking for you.') }}
                </div>
                <button class="nq-button light-blue stake-button" @click="$emit('next')">
                    {{ $t('Let\'s go') }}
                </button>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted } from 'vue';
import { PageHeader, PageBody, HexagonIcon } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';
import StakingIcon from '../icons/Staking/StakingIcon.vue';
import ValidatorIcon from './ValidatorIcon.vue';
import { getNetworkClient, updateValidators } from '../../network';

// const progression = (i:number, n:number) => {
//     if (n % 2 === 0) {
//         throw new Error('Invalid progression scale(not an odd number)!');
//     }
//     const leg = (n - 1) / 2.0;
//     const d = Math.max(0, (i >= leg) ? ((leg + 1) - (n - i)) : (leg - i)) / n;
//     return 1.0 - d;
// };

export default defineComponent({
    setup() {
        // const sortedIcons = computed(() => (useStakingStore().validatorsList.value
        // .filter((validator) => 'icon' in validator) as RegisteredValidator[])
        // .sort((a, b) => b.trust - a.trust)
        // .map((validator) => validator.icon));

        const { validatorsList } = useStakingStore();

        const validators = computed(() => validatorsList.value.length === 0
            ? Array.from({ length: 10 }) as undefined[]
            : validatorsList.value.filter((validator) => 'payoutType' in validator && validator.payoutType !== 'none'),
        );

        function getTopPosition(index: number) {
            return `${((Math.sin((index + 1) * (Math.PI / 10))) * 25)}px`;
        }

        onMounted(async () => {
            if (!validatorsList.value.some((validator) => 'name' in validator)) {
                const client = await getNetworkClient();
                await updateValidators(client);
            }
        });

        return {
            // progression,
            // sortedIcons,
            validators,
            getTopPosition,
        };
    },
    components: {
        PageHeader,
        PageBody,
        StakingIcon,
        HexagonIcon,
        ValidatorIcon,
    },
});
</script>

<style lang="scss" scoped>
    .staking-welcome-page {
        flex-grow: 1;
        background-color: #F8F8F8;
        border-radius: 1.25rem;
    }

    .page-header {
        height: 36.625rem;
        padding-top: 3rem;
        line-height: 1;
        background-color: white;
        flex-grow: 1;

        clip-path: ellipse(170% 100% at 50% 0%);

        ::v-deep .nq-h1 { font-size: var(--h1-size) }

        .staking-icon {
            margin-top: .75rem;
            margin-bottom: 2.375rem;

            & ::v-deep svg {
                font-size: 19rem;
                margin: 0 auto;
            }
        }
    }

    .page-body {
        padding: 0;
        margin: 0;
        overflow: hidden;

        .staking-rounded-background {
            // background-image: url('/img/staking/background-collar.svg');
            background-size: cover;
            background-position: 0rem -1rem;
            background-repeat: no-repeat;
            padding-bottom: 2rem;
            height: 100%;

            .staking-icons-lace {
                position: relative;
                left: -2rem;
                white-space: nowrap;
                flex-grow: 1;
                min-height: 9rem;

                .nq-icon {
                    color: var(--text-10);

                    opacity: 1;
                    transform: translateY(0);

                    --delay: 0ms; // set in the vue template for each icon
                    animation: breathing 1s infinite var(--delay);

                    @keyframes breathing {
                        50% {
                            opacity: .5;
                            transform: translateY(2px);
                        }
                    }
                }

                img, .identicon, .nq-icon {
                    position: relative;
                    display: inline-block;
                    width: 5.375rem;
                    height: 5.375rem;
                    margin-left: .81rem;
                }
            }

            .staking-under-icons-text {
                font-size: 1.75rem;
                font-weight: 600;
                line-height: 2.45rem;
                color: var(--text-60);

                text-align: center;
                max-width: 37.5rem;
                margin: 0 auto;

                padding: 0 4rem;
                padding-bottom: 1.25rem;
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

                .staking-under-icons-text { padding-bottom: .25rem }
            }
        }

        .nq-text { margin: 1rem 0 0 }
    }
</style>
