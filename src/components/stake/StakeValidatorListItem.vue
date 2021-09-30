<template>
    <button
        class="validator-list-item reset flex-row"
        @focus="$emit('focus', true)"
        @blur="$emit('focus', false)">

        <div class="validator-item-wrapper flex-row">
            <div class="validator-left validator-icon">
                <img :src="`/img/staking/providers/${validatorData.icon}`" />
            </div>
            <div class="validator-item-mid flex-column">
                <div class="validator-item-inner-row validator-label">
                    {{ validatorData.label }}
                </div>
                <div class="validator-item-inner-row flex-row validator-trust">
                    <ValidatorTrustScore :score="validatorData.trust" />
                    <img src="/img/staking/dot.svg" />
                    <div class="validator-payout">
                        {{ payoutText }}
                    </div>
                </div>
            </div>
            <ValidatorRewardBubble :reward="validatorData.reward" />
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { StakingData, ValidatorData } from '../../stores/Staking';
import { numberToLiteralTimes } from '../../lib/NumberFormatting';
import { i18n } from '../../i18n/i18n-setup';

import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';

const getPayoutText = (payout: number) => {
    const periods = {
        year: (((3600 * 1000) * 24) * 30) * 12,
        month: ((3600 * 1000) * 24) * 30,
        week: ((3600 * 1000) * 24) * 7,
        day: (3600 * 1000) * 24,
        h: 3600 * 1000,
    };
    let index = 0;
    let value = 0;
    const periodNames = Object.keys(periods);

    for (const [, period] of Object.entries(periods)) {
        value = payout / period;
        if (value >= 1) {
            break;
        }
        index += 1;
    }

    if (index === periodNames.length - 1) {
        return i18n.t('pays out every {hourCount}', { hourCount: `${value}${periodNames[index]}` });
    }

    return i18n.t('pays out {numberOfTimes} a {period}', {
        numberOfTimes: numberToLiteralTimes(Math.floor(value)),
        period: periodNames[index],
    });
};

export default defineComponent({
    props: {
        validatorData: {
            type: Object as () => ValidatorData,
            required: true,
        },
        stakingData: {
            type: Object as () => StakingData,
            required: true,
        },
    },
    setup(props) {
        return {
            payoutText: getPayoutText(props.validatorData.payout),
            Helpers: {
                capitalise: (string: string) => string.charAt(0).toUpperCase() + string.slice(1),
            },
        };
    },
    components: {
        ValidatorTrustScore,
        ValidatorRewardBubble,
    },
});
</script>

<style lang="scss" scoped>
.validator-list-item {
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;

    width: calc(100% - 4rem);
    height: 9.25rem;
    margin: auto;
    background-color: transparent;

    border: 0;
    border-radius: 0.75rem;
    outline: none;

    flex-shrink: 0;

    &:focus {
        outline: 4px solid #f2f2f4;
        box-shadow: none;
    }

    input::-moz-focus-inner {
        border: 0;
    }

    .validator-icon {
        img, svg {
            width: 5.5rem;
            height: 5.5rem;
            display: block;
        }
    }

    &:hover {
        background-color: #f2f2f4;
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
            font-weight: 600;

            &.validator-label {
                font-size: var(--body-size);
           }
        }

        .validator-trust {
            font-size: var(--small-size);
            color: var(--text-50);
        }

        .validator-trust-score {
            margin-right: 0.675rem;
        }

        .validator-payout {
            white-space: nowrap;
            margin-left: 0.675rem;
        }
    }
}
</style>
