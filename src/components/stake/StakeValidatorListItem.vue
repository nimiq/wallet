<template>
    <button class="validator-list-item reset flex-row">
        <div class="validator-item-wrapper">
            <div class="validator-left">
                <component v-bind:is="Icons[Helpers.capitalise(validatorData.icon) + 'Icon']" class="tab"></component>
            </div>
            <div class="validator-item-mid">
                <div class="validator-item-inner-row validator-label">
                    {{ validatorData.label }}
                </div>
                <div class="validator-item-inner-row validator-trust">
                    <div :class="(validatorData.trust < 2.5)?'red-star':'silver-star'" class="star">
                        <StarIcon />
                    </div>
                    <div :class="(validatorData.trust > 2.5)?'gold-text':'red-text'">
                        {{ validatorData.trust.toFixed(2) }}
                    </div>
                    <div class="validator-payout">
                        {{ payoutText }}
                    </div>
                </div>
            </div>
            <div :class="validatorData.reward < 2.5?'validator-warning':''" class="validator-item-right">
                {{ validatorData.reward.toFixed(1) }} % {{ $t("p.a.") }}
            </div>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { numberToLiteralTimes } from '../../lib/NumberFormatting';

/* mock data icons */
import OverstakeIcon from '../icons/Staking/OverstakeIcon.vue';
import NimiqWatchIcon from '../icons/Staking/NimiqWatchIcon.vue';
import NimpoolIcon from '../icons/Staking/NimpoolIcon.vue';
import AceStakingIcon from '../icons/Staking/AceStakingIcon.vue';
import IceStakingIcon from '../icons/Staking/IceStakingIcon.vue';
/* mock data icons */

import StarIcon from '../icons/Staking/StarIcon.vue';

const getPayoutText = (payout) => {
    const periods = ['year', 'month', 'week', 'day', 'h'];
    let index;
    let value;

    for (let i = 0; i < payout.length; i++) {
        if (payout[i] > 0) {
            index = i;
            value = payout[i];
            break;
        }
    }

    if (index === periods.length - 1) {
        return `pays out every ${value}${periods[index]}`;
    }
    return `pays out ${numberToLiteralTimes(value)} a ${periods[index]}`;
};

export default defineComponent({
    setup(props) {
        return {
            payoutText: getPayoutText(props.validatorData.payout),
            Helpers: {
                capitalise: (string) => string.charAt(0).toUpperCase() + string.slice(1),
            },
            Icons: {
                OverstakeIcon,
                NimiqWatchIcon,
                NimpoolIcon,
                AceStakingIcon,
                IceStakingIcon,
            },
        };
    },
    props: {
        validatorData: {
            type: Object,
            required: true,
        },
    },
    components: {
        StarIcon,
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
    // padding: 1rem 0.5rem;
    padding-left: var(--padding-sides);
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
        margin: -.5rem;
        margin-left: .25rem;
        margin-bottom: -.625rem;
        box-shadow: none;
        // display: inline-block;
    }

    input::-moz-focus-inner {
        border: 0;
    }

    &:hover {
        background-color: #f2f2f4;

    }

    .validator-item-wrapper {
        display: flex;
        width: 100%;
        height: 100%;
        flex-direction: row;
        // padding: 1.75rem 2.5rem;
        .validator-left {
            margin-top: 2.25rem;
            margin-left: 2.5rem;
            margin-bottom: -2rem;
            svg {
                width: 5rem;
                height: 5rem;
                border-radius: 2.5rem; // temporary, this will be req just for the mock data I guess
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
            height: 3rem;
            line-height: 3rem;
            &.validator-label {
                padding-top: 0.75rem;
                font-weight: 600;
                font-size: 2rem;
                line-height: 100%;
                color: var(--nimiq-blue);
            }
            &.validator-trust {
            }
        }
        .validator-item-right {
            height: 3rem;
            min-width: 13rem;
            line-height: 2rem;
            margin-top: 3.75rem;
            padding-top: 0.25rem;

            border: 2px solid var(--nimiq-green);
            border-radius: 1.5rem;
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
            font-family: Mulish;
            font-style: normal;
            font-weight: 600;
            font-size: 1.75rem;
            color: rgba(31, 35, 72, 0.5);
        }
        .validator-payout {
            white-space: nowrap;
            padding-left: 1rem;
            padding-top: 0.5rem;
            // font-family: Mulish;
            font-style: normal;
            font-weight: 400;
            font-size: 1.75rem;
            line-height: 100%;
            color: var(--nimiq-blue);

            opacity: 0.5;
        }
    }
    .red-star {
        path {
            fill: var(--nimiq-red);
        }
    }
    .star {
        margin-right: 0.125rem;
        svg {
            width: 1.5rem;
            height: 1.5rem;
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
