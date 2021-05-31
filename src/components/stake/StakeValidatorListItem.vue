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
                    <Tooltip v-if="!isMini" class="validator-label-tip"
                        :preferredPosition="isMini?'top right':'bottom right'"
                        :container="isMini?this.$parent:this">
                        <div slot="trigger" class="validator-label-trigger">
                            <InfoCircleSmallIcon />
                        </div>
                        <span class="validator-label-text">
                            {{ $t('{validatorDescription}', { validatorDescription: validatorData.labelHeaderText }) }}
                        </span>
                        <p class="validator-label-explainer">
                            {{ $t('{disclaimer}', { disclaimer: stakingData.validatorLabelDisclaimer }) }}
                        </p>
                        <br />
                        <a :href="validatorData.link" target="_blank" class="validator-website-link nq-light-blue">
                            {{ $t('{brandName} Website', { brandName: validatorData.label }) }}
                            <ArrowRightSmallIcon />
                        </a>
                    </Tooltip>
                </div>
                <div class="validator-item-inner-row validator-trust">
                    <Tooltip class="validator-score-tip"
                        :preferredPosition="isMini?'top right':'bottom right'"
                        :container="isMini?this.$parent:this">
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
                        <!---->
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
                        <!---->
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
                        <!---->
                        <a :href="validatorData.link" target="_blank" class="validator-website-link nq-light-blue">
                            {{ $t('{brandName} Website', { brandName: validatorData.label }) }}
                            <ArrowRightSmallIcon />
                        </a>
                    </Tooltip>
                    <div class="validator-payout">
                        <img src="/img/staking/dot.svg" />
                        {{ payoutText }}
                    </div>
                </div>
            </div>
            <Tooltip
                class="validator-ppa"
                preferredPosition="bottom left"
                :container="this">
                <div slot="trigger"
                    :class="validatorData.reward < 2.5?'validator-warning':''"
                    class="validator-item-right">
                    {{ validatorData.reward.toFixed(1) }}% {{ $t("p.a.") }}
                </div>
                <div class="tooltip-heading">
                    {{ $t('Your projected return within one year.') }}
                </div>
                <div class="tooltip-content">
                    {{ $t('This is depending on the network and can vary. Learn more at “Estimated rewards”') }}
                </div>
            </Tooltip>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon, InfoCircleSmallIcon, Tooltip } from '@nimiq/vue-components';
import { StakingData, ValidatorData } from '../../stores/Staking';
import { numberToLiteralTimes } from '../../lib/NumberFormatting';
import { i18n } from '../../i18n/i18n-setup';

/* mock data icons */
// import OverstakeIcon from '../icons/Staking/OverstakeIcon.vue';
// import NimiqWatchIcon from '../icons/Staking/NimiqWatchIcon.vue';
// import NimpoolIcon from '../icons/Staking/NimpoolIcon.vue';
// import AceStakingIcon from '../icons/Staking/AceStakingIcon.vue';
// import IceStakingIcon from '../icons/Staking/IceStakingIcon.vue';
/* mock data icons */

import StarIcon from '../icons/Staking/StarIcon.vue';

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
            payoutText: getPayoutText(props.validatorData.payout),
            scoreData,
            Helpers: {
                capitalise: (string: string) => string.charAt(0).toUpperCase() + string.slice(1),
            },
            // Icons: {
            //     OverstakeIcon,
            //     NimiqWatchIcon,
            //     NimpoolIcon,
            //     AceStakingIcon,
            //     IceStakingIcon,
            // },
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
        Tooltip,
        StarIcon,
        InfoCircleSmallIcon,
        ArrowRightSmallIcon,
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
                .validator-ppa {
                    position: relative;
                    top: -2rem;
                    left: 11rem;
                }
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
                .validator-item-right {
                    position: absolute;
                    top: -2.875rem;
                    right: -4.5rem;
                }
            }
        }
    }

    .validator-item-wrapper {
        display: flex;
        width: 46.5rem;
        height: 100%;
        flex-direction: row;

        .validator-ppa /deep/ .tooltip-box {
            width: 25.75rem;
        }

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

                .validator-label-trigger {
                    margin-top: -.25rem;
                    margin-left: 0.5rem;
                    svg {
                        width: 1.5rem;
                        height: 1.5rem;
                        opacity: 0.6;
                    }
                }

                .validator-label-tip {
                }

                .validator-label-text {
                    display: flex;
                    margin-left: .75rem;
                    padding-left: 1.25rem;

                    font-family: Muli, system-ui, sans-serif;
                    font-weight: 600;
                    font-size: 2rem;
                    line-height: 130%;

                    color: white;
                    border-left: .1875rem solid rgba(255, 255, 255, 0.4);
                }

                .validator-label-explainer {
                    margin-bottom: -1rem;
                    font-weight: 600;
                    font-size: 1.75rem;
                    line-height: 130%;

                    opacity: 0.6;
                    width: 31.5rem;
                }
            }
            &.validator-trust {
            }
        }

        .validator-score-tip {
            font-family: Muli, system-ui, sans-serif;
            font-weight: 600;

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
                    align-self: flex-end;
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
        }

        .validator-trust-trigger {
            white-space: nowrap;
            display: flex;
            margin-top: 0.7rem;
        }

        .validator-website-link {
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
        .validator-item-right {
            font-family: Muli, system-ui, sans-serif;
            height: 3.125rem;
            line-height: 2rem;
            margin-top: 3.5rem;
            margin-left: -0.25rem;
            padding: .5rem .875rem;
            padding-top: 0.375rem;

            border: 1.5px solid var(--nimiq-green);
            border-radius: 1.75rem;
            justify-content: flex-end;
            white-space: nowrap;
            text-align: center;
            color: var(--nimiq-green);
            font-size: 2rem;
            font-weight: bold;

            &.validator-warning {
                border: 2px solid var(--nimiq-orange);
                color: var(--nimiq-orange);
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
                position:relative;
                top: -.625rem;
                left: -.5rem;
                margin: -.5rem;
            }
        }
    }
    .star {
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

.tooltip-heading {
    font-weight: 600;
    font-size: 2rem;
    line-height: 130%;
    color: white;
}

.tooltip-content {
    font-weight: 600;
    font-size: 1.75rem;
    line-height: 130%;
    color: white;
    opacity: 0.6;
}
</style>
