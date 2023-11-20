<template>
    <div class="staking-welcome-page flex-column">
        <PageHeader>
            <template #default>
                <div class="staking-icon">
                    <HeroIcon />
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
                    <template v-for="(validator, index) in validators">
                        <img v-if="validator && 'icon' in validator"
                            :key="index"
                            :src="`/img/staking/providers/${validator.icon}`"
                            alt="validator-logo"
                            :style="{ top: getTopPosition(index) }"
                        />
                        <Identicon v-else-if="validator && 'address' in validator" :key="index"
                            :address="validator.address"
                            :style="{ top: getTopPosition(index) }"/>
                        <HexagonIcon v-else :key="index"
                            :style="{ top: getTopPosition(index), '--delay': `${index * 100}ms` }"/>
                    </template>
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
import { computed, defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody, Identicon, HexagonIcon } from '@nimiq/vue-components';
import { useStakingStore } from '../../stores/Staking';
import HeroIcon from '../icons/Staking/HeroIcon.vue';

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
            : validatorsList.value,
        );

        function getTopPosition(index: number) {
            return `${((Math.sin((index + 1) * (Math.PI / 10))) * 20)}px`;
        }

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
        HeroIcon,
        Identicon,
        HexagonIcon,
    },
});
</script>

<style lang="scss" scoped>
    .staking-welcome-page {
        flex-grow: 1;
    }

    .page-header {
        height: 36.625rem;
        padding-top: 3rem;
        line-height: 1;

        ::v-deep .nq-h1 {
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
                margin-top: 3rem;
                white-space: nowrap;
                flex-grow: 1;
                min-height: 9rem;
                .nq-icon {
                    --delay: 0ms;
                    color: var(--text-10);

                    animation-name: breathing;
                    animation-duration: 1s;
                    animation-iteration-count: infinite;
                    animation-delay: var(--delay);

                    opacity: 1;
                    transform: translateY(0);

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
