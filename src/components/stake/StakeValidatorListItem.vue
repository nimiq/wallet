<template>
    <button
        class="validator-list-item reset flex-row"
        :class="{ 'wrapper-mini': isMini }"
        @click="selectValidator(validatorData)"
        @focus="$emit('focus', true)"
        @blur="$emit('focus', false)">

        <div class="validator-item-wrapper" :class="{ 'wrapper-mini': isMini }">
            <div class="validator-left validator-icon"
                :class="{ 'mini-validator-icon': isMini }">
                <img :src="`/img/staking/providers/${validatorData.icon}`" />
            </div>
            <div class="validator-item-mid">
                <div class="validator-item-inner-row validator-label">
                    {{ validatorData.label }}
                    <LabelTooltip v-if="!isMini"
                        :validatorData="validatorData"
                        :stakingData="stakingData" />
                </div>
                <div class="validator-item-inner-row validator-trust">
                    <ScoreTooltip
                        :isMini="isMini"
                        :stakingData="stakingData"
                        :validatorData="validatorData"
                        />
                    <div class="validator-payout">
                        <img src="/img/staking/dot.svg" />
                        {{ payoutText }}
                    </div>
                </div>
            </div>
            <RewardTooltip
                :isMini="isMini"
                :validatorData="validatorData"
                />
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { InfoCircleSmallIcon } from '@nimiq/vue-components';
import { StakingData, ValidatorData } from '../../stores/Staking';
import { numberToLiteralTimes } from '../../lib/NumberFormatting';
import { i18n } from '../../i18n/i18n-setup';

import LabelTooltip from './tooltips/LabelTooltip.vue';
import ScoreTooltip from './tooltips/ScoreTooltip.vue';
import RewardTooltip from './tooltips/RewardTooltip.vue';

const getPayoutText = (payout: Array<number>) => {
    const periods = ['year', 'month', 'week', 'day', 'h'];
    let index = 0;
    let value = 0;

    for (let i = 0; i < payout.length; i++) {
        if (payout[i] > 0) {
            index = i;
            value = payout[i];
            break;
        }
    }

    if (index === periods.length - 1) {
        return i18n.t('pays out every {hourCount}', { hourCount: `${value}${periods[index]}` });
    }

    return i18n.t('pays out {numberOfTimes} a {period}', {
        numberOfTimes: numberToLiteralTimes(value),
        period: periods[index],
    });
};

export default defineComponent({
    setup(props) {
        return {
            payoutText: getPayoutText(props.validatorData.payout),
            Helpers: {
                capitalise: (string: string) => string.charAt(0).toUpperCase() + string.slice(1),
            },
        };
    },
    props: {
        validatorData: {
            type: Object as () => ValidatorData,
            required: true,
        },
        validatorsList: {
            type: Array as () => ValidatorData[],
            required: true,
        },
        stakingData: {
            type: Object as () => StakingData,
            required: true,
        },
        selectValidator: {
            type: Function as () => unknown,
            required: true,
        },
        isMini: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    components: {
        LabelTooltip,
        ScoreTooltip,
        RewardTooltip,
    },
});
</script>

<style lang="scss" scoped>
.validator-list-item {
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;

    width: 48.5rem;
    line-height: 9rem;
    margin: auto;
    margin-bottom: -.25rem;
    background-color: transparent;

    border: 0;
    border-radius: 0.75rem;
    color: var(--text-70);
    outline: none;

    &:focus {
        width: 49.5rem;
        border: 4px solid #f2f2f4;
        margin: -.375rem -.5rem -.875rem .5rem;
        box-shadow: none;
    }

    input::-moz-focus-inner {
        border: 0;
    }

    &:hover {
        background-color: #f2f2f4;
    }
    &.wrapper-mini {
        cursor: initial;
        width: 27.625rem;
        &:focus, &:first-child {
            border: 0;
            margin: 0;
            width: inherit;
        }
        &:hover {
            background-color: transparent;
        }
        .validator-item-wrapper {
            &.wrapper-mini {
                position: relative;
                width: 27.625rem;
                .validator-left {
                    align-self: baseline;
                    justify-content: flex-start;
                    margin: 0;
                    margin-top: 0.5rem;
                }
                .validator-item-mid {
                    padding: 0;
                    width: auto;
                    min-height: 5rem;
                }
                .validator-item-inner-row {
                    display: flex;
                    justify-content: flex-start;
                    margin-top: 0.25rem;
                    &.validator-label {
                        font-size: 2.5rem;
                        font-weight: 700;
                        margin: 0rem 0.75rem;
                        color: var(--nimiq-blue);
                    }
                }
            }
        }
    }

    .validator-item-wrapper {
        display: flex;
        width: 46.5rem;
        height: 100%;
        flex-direction: row;

        .validator-left {
            margin-top: 2.25rem;
            margin-left: 2.5rem;
            margin-bottom: -2rem;
            &.validator-icon {
                img, svg {
                    width: 5rem;
                    height: 5rem;
                }
                &.mini-validator-icon {
                    display: flex;
                    img, svg {
                        width: 3rem;
                        height: 3rem;
                    }
                }
            }
        }
        .validator-item-mid {
            display: flex;
            flex-direction: column;
            width: 100%;
            padding-top: 2.25rem;
            padding-left: 2.25rem;
        }
        .validator-item-inner-row {
            display: flex;
            flex-direction: row;
            width: 17rem;
            min-height: 3rem;
            line-height: 3rem;
            &.validator-label {
                padding-top: 0.75rem;
                font-weight: 600;
                font-size: 2rem;
                line-height: 100%;
           }
        }

        .validator-trust-trigger {
            white-space: nowrap;
            display: flex;
            margin-top: 0.7rem;
        }

        /deep/ .validator-website-link {
            display: inline-block;
            margin-top: 1rem;
            align-self: center;
            font-size: 2rem;
            font-weight: bold;
            text-decoration: none;
            white-space: nowrap;
            svg {
                padding-top: 0.625rem;
                display: inline-block;
            }
        }
        .validator-trust {
            font-style: normal;
            font-weight: 600;
            font-size: 1.75rem;
            color: rgba(31, 35, 72, 0.5);
        }
        .validator-trust-score {
            margin-right: 1rem;
        }
        .validator-payout {
            white-space: nowrap;
            padding-left: 1rem;
            padding-top: 0.5rem;
            font-style: normal;
            font-weight: 600;
            font-size: 1.75rem;
            line-height: 100%;
            color: var(--nimiq-blue);

            opacity: 0.5;
            img {
                position: relative;
                top: -.625rem;
                left: -.5rem;
                margin: -.5rem;
            }
        }
    }
}
</style>
