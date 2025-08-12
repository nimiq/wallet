<template>
    <Modal class="staking-rewards-modal">
        <PageHeader>
            <label>{{ $t('Staking Rewards') }}</label>
            <span slot="more" class="date">
                {{ monthLabel }}
                <span v-if="showOngoingIndicator">
                    <strong>&middot;</strong> {{ $t('Ongoing') }}
                </span>
            </span>
        </PageHeader>
        <PageBody class="flex-column">
            <div class="flex-row sender-recipient" v-if="monthlyReward">
                <div class="address-info flex-column">
                    <div class="identicon">
                        <ValidatorIcon :validator="
                            validatorList[monthlyReward.validators[0]]
                            || { address: monthlyReward.validators[0] }
                        "/>
                    </div>
                    <span class="label">{{ validatorName }}</span>
                    <AddressDisplay :address="monthlyReward.validators[0]" copyable/>
                </div>
                <ArrowRightIcon class="arrow"/>
                <div class="address-info flex-column">
                    <Identicon :address="activeAddress"/>
                    <span class="label">{{ myLabel }}</span>
                    <AddressDisplay :address="activeAddress" copyable/>
                </div>
            </div>

            <div class="amount-and-message flex-column">
                <Amount
                    v-if="monthlyReward"
                    class="transaction-value nq-green"
                    :amount="monthlyReward.total"
                    value-mask
                />

                <!-- <div class="flex-row">
                    <div v-if="fiat.value === undefined" class="fiat-amount">&nbsp;</div>
                    <div v-else-if="fiat.value === constants.FIAT_PRICE_UNAVAILABLE" class="fiat-amount">
                        {{ $t('Fiat value unavailable') }}
                    </div>
                    <div v-else class="fiat-amount">
                        <Tooltip>
                            <template slot="trigger">
                                <FiatAmount
                                    :amount="fiat.value"
                                    :currency="fiat.currency"
                                    value-mask/>
                            </template>
                            <span>{{ $t('Historic value') }}</span>
                            <p class="explainer">
                                {{ $t('This historic value is based on an average of cross-exchange prices.'
                                    + ' It might vary due to market volatility and liquidity.') }}
                            </p>
                        </Tooltip>
                    </div>
                </div> -->
            </div>

            <div class="flex-spacer"></div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    Identicon,
    ArrowRightIcon,
    AddressDisplay,
    FiatAmount,
    Tooltip,
    InfoCircleSmallIcon,
} from '@nimiq/vue-components';
import { useI18n } from '@/lib/useI18n';
import Amount from '../Amount.vue';
import Modal from '../modals/Modal.vue';
import BlueLink from '../BlueLink.vue';
import { useTransactionsStore, toMs } from '../../stores/Transactions';
import { useAddressStore } from '../../stores/Address';
import { useContactsStore } from '../../stores/Contacts';
import { useNetworkStore } from '../../stores/Network';
import { twoDigit } from '../../lib/NumberFormatting';
import { parseData } from '../../lib/DataFormatting';
import {
    CryptoCurrency,
    FIAT_PRICE_UNAVAILABLE,
} from '../../lib/Constants';
import { useAccountStore } from '../../stores/Account';
import { explorerTxLink } from '../../lib/ExplorerUtils';
import { getStakingTransactionMeaning } from '../../lib/StakingUtils';
import ValidatorIcon from './ValidatorIcon.vue';
import { useStakingRewards } from '@/composables/useStakingRewards';
import { useStakingStore } from '@/stores/Staking';

export default defineComponent({
    name: 'staking-rewards-modal',
    props: {
        month: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const { getMonthLabel, isOngoingMonth, getMonthlyReward } = useStakingRewards();
        const { validators: validatorList } = useStakingStore();
        const { activeAddress, activeAddressInfo } = useAddressStore();

        const constants = {
            FIAT_PRICE_UNAVAILABLE,
        };
        // Fiat conversion (simplified)
        const fiat = computed(() => ({
            value: undefined,
            currency: 'USD',
        }));

        const monthLabel = computed(() => getMonthLabel(props.month));
        const showOngoingIndicator = computed(() => isOngoingMonth(props.month));
        const monthlyReward = computed(() => getMonthlyReward(props.month));

        const myLabel = computed(() => activeAddressInfo.value?.label);
        const validatorName = computed(() => {
            if (!monthlyReward.value) return '';
            const validatorAddress = monthlyReward.value.validators[0];
            const validator = validatorList.value[validatorAddress] || { address: validatorAddress };
            return 'name' in validator ? validator.name : validatorAddress;
        });

        return {
            constants,
            fiat,
            monthLabel,
            showOngoingIndicator,
            monthlyReward,
            activeAddress,
            myLabel,
            validatorList,
            validatorName,
        };
    },
    components: {
        Amount,
        ArrowRightIcon,
        Identicon,
        PageBody,
        PageHeader,
        Modal,
        AddressDisplay,
        FiatAmount,
        Tooltip,
        InfoCircleSmallIcon,
        BlueLink,
        ValidatorIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";
@import '../../scss/functions.scss';

.page-header {
    ::v-deep .nq-h1 {
        margin-left: 2rem;
        margin-right: 2rem;
        max-width: calc(100% - 4rem);
        white-space: nowrap;
        overflow: hidden;
        margin-bottom: 1rem;
        mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
    }

    span {
        font-size: var(--body-size);
        font-weight: 600;
        align-items: center;
        justify-content: center;

        &.date {
            display: block;
            color: nimiq-blue(0.6);
        }
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    padding-bottom: 3rem;
}

.sender-recipient {
    justify-content: space-between;
    width: 100%;
    padding: 0 1rem;

    .arrow {
        font-size: 3rem;
        margin-top: 2.5rem;
        opacity: 0.4;
        flex-shrink: 0;
    }
}

.address-info {
    align-items: center;
    width: 19rem;
}

.identicon {
    position: relative;
    width: 9rem;
    height: 9rem;
    margin: -0.5rem 0;

    > .identicon, > .validator-icon {
        margin: 0;
    }

    svg, img, .validator-icon {
        width: 100%;
        height: 100%;
        --size: 100%;
    }
}

.label,
.nq-input-s {
    font-size: var(--body-size);
    font-weight: 600;
    text-align: center;
}

.label {
    margin: 2rem 0 1rem;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
}

.nq-input-s {
    margin: 1.25rem 0 0.375rem;
    max-width: 100%;
}

.nq-input-s:not(:focus):not(:hover) {
    mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0) calc(100% - 1rem));
}

.address-display {
    padding: 0;
    font-size: var(--body-size);

    ::v-deep .chunk {
        margin: 0.5rem 0;
    }
}

.amount-and-message {
    align-items: center;
    margin: 4rem 0 1rem;

    .amount.transaction-value {
        --size: 5rem;
        font-size: var(--size);
        line-height: 1;
        margin-bottom: 0.5rem;

        ::v-deep .currency {
            font-size: 0.5em;
            font-weight: bold;
            margin-right: -1.9em;
        }

        &::before {
            content: '+';
            margin-right: -0.1em;
            margin-left: -0.6em;
        }

        @media (max-width: $mobileBreakpoint) {
            font-size: 4.75rem;
        }
    }

    .flex-row {
        align-items: center;
    }

    .fiat-amount {
        --size: var(--small-size);
        font-size: var(--size);
        font-weight: 600;
        color: var(--text-50);
        line-height: 1;

        .tooltip {
            ::v-deep .trigger {
                .fiat-amount {
                    transition: color 0.2s var(--nimiq-ease);
                }

                &:hover .fiat-amount,
                &:focus .fiat-amount {
                    color: var(--text-60);
                }

                &::after {
                    top: -1.5rem;
                    background: #211B43;
                }
            }

            ::v-deep .tooltip-box {
                width: 28rem;
                transform: translate(-10rem, -1.5rem);
            }

            ::v-deep [value-mask]::after{
                margin-right: 0;
            }
        }
    }
}

.message {
    margin: 4rem 0 1rem;
    text-align: center;
    font-size: var(--body-size);
    line-height: 1.375;
    word-break: break-word;
}

.info-tooltip {
    position: absolute;
    left: 2rem;
    top: 2rem;
    z-index: 3;

    ::v-deep .trigger {
        color: nimiq-blue(0.25);
        font-size: 2.25rem;

        transition: color 0.3s var(--nimiq-ease);

        &::before {
            content: '';
            display: block;
            position: absolute;
            left: -1.5rem;
            top: -1.5rem;
            right: -1.5rem;
            bottom: -1.5rem;
            border-radius: 50%;
        }

        &:hover,
        &:focus {
            color: nimiq-blue(0.6);
        }
    }

    ::v-deep .tooltip-box {
        font-size: var(--small-size);
        white-space: nowrap;
        line-height: 1.3;
        font-weight: 600;
        transform: translate(-1rem, 2rem);
    }

    .confirmations {
        display: block;
        font-size: var(--small-label-size);
        opacity: 0.6;
    }

    .confirmations-skeleton {
        height: 1.5rem;
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.25rem;
        margin-top: 0.5rem;
    }

    .fee {
        display: inline-block;
        margin-top: 1.25rem;
    }

    .blue-link {
        color: var(--nimiq-light-blue-on-dark);
        margin-top: 1.25rem;
    }
}

@media (max-width: $mobileBreakpoint) {
    .page-header {
        ::v-deep .nq-h1 {
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }
    }

    .address-info {
        flex-shrink: 0;
    }

    .tooltip {
        ::v-deep .tooltip-box {
            transform: translate(1rem, 2rem);
        }
    }
}

@media (max-width: 450px) {
    .page-header {
        ::v-deep .nq-h1 {
            margin-left: 3rem;
            margin-right: 3rem;
        }
    }
}

@media (max-width: 400px) {
    .sender-recipient {
        padding: 0;
    }
}

@media (max-width: 374px) {
    .page-body {
        padding-left: 2rem;
        padding-right: 2rem;
    }
}
</style>
