<template>
    <button class="validator-list-item reset flex-row">
        <div class="validator-item-wrapper flex-row">
            <div class="validator-icon">
                <img v-if="'icon' in validator"
                    :src="`/img/prestaking/providers/${validator.icon}`" :alt="validator.label"
                />
                <Identicon v-else :address="validator.address"/>
            </div>
            <div class="validator-item-mid flex-column">
                <div class="validator-item-inner-row flex-row">
                    <template v-if="'label' in validator">
                        <span class="validator-label">{{ validator.label }}</span>
                        <ValidatorDescriptionTooltip :container="container" :validator="validator">
                            <InfoCircleSmallIcon class="trigger"/>
                        </ValidatorDescriptionTooltip>
                    </template>
                    <ShortAddress v-else :address="validator.address" :displayedCharacters="18"/>
                </div>
                <div class="validator-item-inner-row flex-row validator-trust">
                    <!-- <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" />
                    <strong v-if="'trust' in validator && payoutText" class="dot">&middot;</strong>
                    <div v-if="payoutText" class="validator-payout">{{ payoutText }}</div> -->
                    <div v-if="validator.stake !== null" class="validator-stake">
                        {{ $t('Stake: {validatorStake}%', { validatorStake: validatorStakePercentage }) }}
                    </div>
                    <template v-if="validator.isUnderdog">
                        <strong class="dot">&middot;</strong>
                        <div class="validator-underdog">
                            {{ $t('Underdog') }}
                        </div>
                    </template>
                    <template v-if="hasHighStake">
                        <strong class="dot">&middot;</strong>
                        <div class="validator-high-stake nq-orange">
                            {{ $t('High stake!') }}
                        </div>
                    </template>
                </div>
            </div>
            <!-- <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" /> -->
            <div v-if="validator.isUnderdog" class="underdog-info flex-row">
                <img src="../../assets/prestaking/underdog-icon.svg" alt="Underdog" class="underdog-icon">
                <div class="points-pill">{{ $t('5x points') }}</div>
            </div>
        </div>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent, watch } from '@vue/composition-api';
import { Identicon, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { usePrestakingStore, Validator } from '../../stores/Prestaking';

// import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';
import ShortAddress from '../ShortAddress.vue';
import ValidatorDescriptionTooltip from './tooltips/ValidatorDescriptionTooltip.vue';

export default defineComponent({
    props: {
        container: HTMLElement,
        validator: {
            type: Object as () => Validator & { isUnderdog?: boolean },
            required: true,
        },
    },
    setup(props) {
        // const payoutText = computed(() => 'label' in props.validator
        //     ? getPayoutText(props.validator.payoutType)
        //     : context.root.$t('Unregistered validator'));

        const { globalStake } = usePrestakingStore();

        watch(() => props.validator, () => {
            console.log('validator changed', props.validator.stake); // eslint-disable-line no-console
        });

        const validatorStakePercentage = computed(
            () => Math.floor(((props.validator.stake || 0) / globalStake.value) * 1000) / 10,
        );

        const hasHighStake = computed(() => props.validator.stake !== null && validatorStakePercentage.value >= 20);

        return {
            // payoutText,
            validatorStakePercentage,
            hasHighStake,
        };
    },
    components: {
        Identicon,
        // ValidatorTrustScore,
        // ValidatorRewardBubble,
        ShortAddress,
        ValidatorDescriptionTooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';
@import '../../scss/variables.scss';

.validator-list-item {
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;

    width: calc(100% - 4rem);
    height: 9.25rem;
    background-color: transparent;

    border: 0;
    border-radius: 0.75rem;
    outline: none;

    flex-shrink: 0;

    transition: background-color 400ms var(--nimiq-ease);

    &:hover, &:focus { background-color: #f2f2f4 }

    .validator-icon {
        img, .identicon {
            --size: 5.5rem;

            width: var(--size);
            height: var(--size);
            display: block;
        }
    }
}

.validator-item-wrapper {
    width: 100%;
    height: 100%;
    align-items: center;
    padding: 0 2.25rem;

    .validator-item-mid {
        flex-grow: 1;
        flex-shrink: 1;
        padding-left: 2.25rem;
        min-width: 0;
    }

    .validator-item-inner-row {
        line-height: 3rem;
        align-items: center;
        padding-right: 2rem;
        font-size: var(--body-size);

        .validator-label { font-weight: 600 }
        .short-address { font-weight: 500 }

        .trigger {
            color: nimiq-blue(0.4);

            transition: color 400ms var(--nimiq-ease);

            &:hover, &:focus { color: nimiq-blue(.6) }
        }
    }

    .validator-trust {
        color: var(--text-50);
        font-size: var(--small-size);
    }

    .dot { margin: 0 0.675rem }
    .validator-payout { white-space: nowrap }

    .validator-stake,
    .validator-underdog {
        font-weight: 600;
        white-space: nowrap;
    }

    .validator-5x-points,
    .validator-high-stake {
        font-weight: bold;
    }
}

.underdog-info {
    align-items: center;
    display: flex; // Ensure it's displayed by default
}

.underdog-icon {
    --size: 3.25rem;

    width: var(--size);
    height: var(--size);
    margin-right: 1rem;
}

.points-pill {
    font-weight: bold;
    font-size: var(--small-size);
    color: var(--nimiq-green);
    border-radius: 1.75rem;
    border: 1.5px solid var(--Green, var(--nimiq-green));
    padding: 0.25rem 0.75rem;
}

// Add this media query at the end of the style block
@media (max-width: $mobileBreakpoint) {
    .underdog-info {
        display: none;
    }
}
</style>
