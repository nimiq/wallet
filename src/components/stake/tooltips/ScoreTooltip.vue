<template>
    <Tooltip class="validator-score-tip"
        :preferredPosition="isMini?'top right':'bottom right'"
        :container="this.$parent">
        <div slot="trigger" class="validator-trust-trigger">
            <div :class="{
                'red-star': (validatorData.trust < 2.5),
                'silver-star': (validatorData.trust < 2.5 && (validatorData.trust < 5.0)),
                'gold-star': (validatorData.trust >= 5.0),
            }" class="star">
                <StarIcon />
            </div>
            <div class="validator-trust-score" :class="{
                    'red-text': validatorData.trust < 2.5,
                    'gold-text': validatorData.trust >= 5.0,
                }">
                {{ validatorData.trust.toFixed(2) }}
            </div>
        </div>
        <div class="validator-score-section" :class="{ 'warning-text': validatorData.uptime < 96 }">
            <div class="validator-score-reason">
                {{ $t('{number}% Uptime', { number: validatorData.uptime }) }}
            </div>
            <div class="validator-score-outcome">
                {{ scoreData.uptime[1] }}
            </div>
        </div>
        <div class="validator-score-explainer" :class="{ 'warning-text': validatorData.uptime < 96 }">
            {{ $t('{text}', { text: scoreData.uptime[2] }) }}
        </div>
        <div class="validator-score-section" :class="{ 'warning-text': validatorData.monthsOld < 2 }">
            <div class="validator-score-reason">
                {{ $t('{number} months old', { number: validatorData.monthsOld }) }}
            </div>
            <div class="validator-score-outcome">
                {{ scoreData.age[1] }}
            </div>
        </div>
        <div class="validator-score-explainer" :class="{ 'warning-text': validatorData.monthsOld < 2 }">
            {{ $t('{text}', { text: scoreData.age[2] }) }}
        </div>
        <div class="validator-score-section" :class="{
            'warning-text': validatorData.dominance > 12 && validatorData.dominance <= 22,
            'danger-text': validatorData.dominance > 22,
            }">
            <div class="validator-score-reason">
                {{ $t('{number}% Dominance', { number: validatorData.dominance }) }}
            </div>
            <div class="validator-score-outcome">
                {{ scoreData.dominance[1] }}
            </div>
        </div>
        <div class="validator-score-explainer" :class="{
            'warning-text': validatorData.dominance > 12 && validatorData.dominance <= 22,
            'danger-text': validatorData.dominance > 22,
            }">
            {{ $t('{text}', { text: scoreData.dominance[2] }) }}
        </div>
        <a :href="validatorData.link" target="_blank" class="validator-website-link nq-light-blue">
            {{ $t('{brandName} Website', { brandName: validatorData.label }) }}
            <ArrowRightSmallIcon />
        </a>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon, Tooltip } from '@nimiq/vue-components';
import { ValidatorData, StakingData } from '../../../stores/Staking';

import StarIcon from '../../icons/Staking/StarIcon.vue';

const getRuleOutcome = (ruleset: Array<string>, scalar:number, upwards = true) => {
    let result = null;
    for (let i = 0; i < ruleset.length; i++) {
        if (upwards) {
            if (scalar < parseFloat(ruleset[i][0])) {
                result = ruleset[i];
                break;
            }
        } else if (scalar > parseFloat(ruleset[i][0])) {
            result = ruleset[i];
            break;
        }
    }
    return result;
};

export default defineComponent({
    setup(props) {
        const scoreData = computed(() => ({
            uptime: getRuleOutcome(props.stakingData.uptimeRules, props.validatorData.uptime),
            age: getRuleOutcome(props.stakingData.ageRules, props.validatorData.monthsOld),
            dominance: getRuleOutcome(props.stakingData.dominanceRules, props.validatorData.dominance),
        }));
        return {
            scoreData,
        };
    },
    props: {
        isMini: {
            type: Boolean,
            required: true,
        },
        validatorData: {
            type: Object as () => ValidatorData,
            required: true,
        },
        stakingData: {
            type: Object as () => StakingData,
            required: true,
        },
    },
    components: {
        Tooltip,
        StarIcon,
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.validator-score-tip {
    margin-top: .625rem;
    margin-right: .5rem;
    font-family: Muli, system-ui, sans-serif;
    font-weight: 600;

    .trigger .validator-trust-trigger {
        display: flex;
        flex-direction: row;
        white-space: nowrap;
    }

    .validator-score-section {
        display: flex;
        height: 2rem;
        width: 31.5rem;
        margin-bottom: 1rem;
        flex-direction: row;
        white-space: nowrap;
        font-size: 2rem;
        font-weight: 700;

        .validator-score-outcome {
            margin-left: auto;
        }
    }

    .validator-score-explainer {
        color: #FFFFFF;
        opacity: 0.6;
    }

    .warning-text {
        color: #FC8702;
        .validator-score-explainer {
            color: inherit;
        }
    }
    .danger-text {
        color: #FF5C48;
    }
    .star {
        display: inline-block;
        margin-right: 0.25rem;
        opacity: 1.0;
        svg {
            width: 1.5rem;
            height: 1.5rem;
            path {
                fill: rgba(31, 35, 72, 0.5);
            }
        }
        &.red-star {
            path {
                fill: var(--nimiq-red);
            }
        }
        &.gold-star {
            path {
                fill: var(--nimiq-gold);
            }
        }
    }
    .gold-text {
        color: var(--nimiq-gold);
    }
    .red-text {
        color: var(--nimiq-red);
    }
}
</style>
