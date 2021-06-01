<template>
    <div class="already-staked-wrapper">
        <div class="row">
            <div class="col">
                <div class="section-title">
                    <StakingIcon />
                    staked
                </div>
                <div class="amount-staked">
                    <Amount ref="$stakedNIMAmount"
                        :decimals="DISPLAYED_DECIMALS"
                        :amount="validator.stakedAmount"
                        :currency="STAKING_CURRENCY"
                        :currencyDecimals="NIM_DECIMALS" />
                </div>
                <div class="amount-staked-proportional">
                    {{ $t('{percentage}% of address\'s balance', { percentage: percentage.toFixed(2) }) }}
                </div>
            </div>
            <div class="col right">
                <button class="nq-button-s"
                    @click="$emit('adjust-stake')">
                        Adjust Stake</button>
                <button class="nq-button-s solid-red">Unstake all</button>
            </div>
        </div>
        <div class="horizontal-separator" />
        <div class="row">
            <div class="col">
                <div class="section-title">
                    validator
                </div>

                <StakeValidatorListItem
                    :validatorData="validator"
                    :stakingData="stakingData"
                    :validatorsList="validatorsList"
                    :selectValidator="() => {}"
                    :isMini="true"
                />
            </div>
            <div class="col right">
                <button class="nq-button-s">Switch Validator</button>
            </div>
        </div>
        <div class="rewards-history">
            <a href="#">
                {{ $t('Rewards history') }} &gt;
            </a>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { Amount } from '@nimiq/vue-components';
import { ValidatorData } from '../../../stores/Staking';

import StakeValidatorListItem from '../StakeValidatorListItem.vue';
import { calculateDisplayedDecimals } from '../../../lib/NumberFormatting';

import StakingIcon from '../../icons/Staking/StakingIcon.vue';
import stakingData from '../assets/staking.json';
import { CryptoCurrency, NIM_DECIMALS } from '../../../lib/Constants';

export default defineComponent({
    setup(props) {
        const percentage = ref(
            (props.availableBalance > 0) ? ((100 * props.validator.stakedAmount) / props.availableBalance) : 0,
        );

        return {
            NIM_DECIMALS,
            STAKING_CURRENCY: CryptoCurrency.NIM,
            DISPLAYED_DECIMALS: calculateDisplayedDecimals(props.availableBalance, CryptoCurrency.NIM),
            stakingData,
            percentage,
        };
    },
    props: {
        availableBalance: {
            type: Number,
            required: true,
        },
        validator: {
            type: Object as () => ValidatorData,
            required: true,
        },
        validatorsList: {
            type: Array as () => ValidatorData[],
            required: true,
        },
    },
    components: {
        StakeValidatorListItem,
        StakingIcon,
        Amount,
    },
});
</script>

<style lang="scss" scoped>
.already-staked-wrapper {
    margin: 1.875rem;
    padding-left: 0.1875rem;
    .section-title {
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--nimiq-blue);
        letter-spacing: 1px;
        text-transform: uppercase;
        opacity: 0.4;
        margin-bottom: 1.125rem;
        svg {
            position: relative;
            top: 0.375rem;
            width: 2.5rem;
            opacity: .7;
            line, path {
                stroke:  var(--nimiq-blue);
                stroke-width: 1;
            }
        }
    }
    .amount-staked {
        font-size: 2.5rem;
        font-weight: bold;
        color: var(--nimiq-blue);
    }
    .amount-staked-proportional {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--nimiq-blue);
        opacity: .5;
    }
    .horizontal-separator {
        width: 100%;
        height: 0.1875rem;
        border-top: 0.1875rem solid var(--nimiq-blue);
        opacity: 0.2;

        margin-top: 4rem;
        margin-bottom: 4rem;
    }
    .rewards-history {
        font-weight: 600;
        font-size: 1.75rem;
        line-height: 2.625rem;
        opacity: 0.4;
        margin-top: 7rem;
        text-align: center;
        a {
            color: var(--nimiq-blue);
            text-decoration: none;
        }
    }
}
.solid-red {
    background-color: var(--nimiq-red);
    color: #fff;
}
.row {
    display: flex;
    flex-direction: row;
    .col {
        button {
            margin-right: 2rem;
        }
    }
}
.centered {
    display: flex;
    justify-self: center;
    justify-content: center;
    margin: auto;
}
.right {
    display: flex;
    justify-self: center;
    justify-content: center;
    margin: auto;
    padding-top: 1.125rem;
    margin-right: 0;
}
</style>
