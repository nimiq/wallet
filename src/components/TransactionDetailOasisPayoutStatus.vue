<template>
    <span v-if="data.htlc && data.htlc.settlement" class="oasis-payout-status">
        <span v-if="data.htlc.settlement.status === SettlementStatus.PENDING
            || data.htlc.settlement.status === SettlementStatus.ACCEPTED" class="nq-light-blue flex-row">
            <CircleSpinner v-if="isInstantPayout"/>
            {{ $t('{currency} payout pending', { currency: data.asset }) }}
            <Tooltip v-if="!isInstantPayout" preferredPosition="bottom left">
                <InfoCircleSmallIcon slot="trigger"/>
                <strong>{{ $t('Your payout is on its way') }}</strong>
                <p class="explainer">{{ $t('This usually takes between one and two working days.') }}</p>
                <p class="explainer">{{ $t('Use a SEPA Instant account to get payouts in minutes.') }}</p>
            </Tooltip>
        </span>
        <span v-else-if="data.htlc.settlement.status === SettlementStatus.DENIED" class="nq-orange flex-row">
            {{ $t('OASIS limit exceeded') }}
            <Tooltip preferredPosition="bottom left">
                <InfoCircleSmallIcon slot="trigger"/>
                <strong>{{ $t('The limit on your IBAN has been reached') }}</strong>
                <p class="explainer">
                    {{ $t('Your EUR will be transferred to your bank account as soon as new limit is available.') }}
                </p>
            </Tooltip>
        </span>
        <span v-else-if="data.htlc.settlement.status === SettlementStatus.FAILED" class="nq-orange flex-row">
            {{ $t('{currency} could not be paid out', { currency: data.asset }) }}
            <Tooltip preferredPosition="bottom left">
                <InfoCircleSmallIcon slot="trigger"/>
                <strong>{{ $t('Something went wrong with your transaction') }}</strong>
                <p class="explainer">
                    {{ $t('Proceed to the troubleshooting page to find out what to do next.') }}
                </p>
            </Tooltip>
        </span>
    </span>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { CircleSpinner, Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { SettlementStatus } from '@nimiq/oasis-api';
import { SwapEurData } from '../stores/Swaps';

export default defineComponent({
    props: {
        data: {
            type: Object as () => SwapEurData,
            required: true,
        },
    },
    setup(props) {
        const isInstantPayout = computed(() => {
            if (!props.data.htlc?.settlement) return false;
            if (props.data.htlc.settlement.status === SettlementStatus.PENDING) return true;
            if (!props.data.htlc.settlement.eta) return false;
            return props.data.htlc.settlement.eta - Date.now() < 5 * 60 * 1000;
        });

        return {
            SettlementStatus,
            isInstantPayout,
        };
    },
    components: {
        CircleSpinner,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
    @import '../scss/functions.scss';

    .flex-row {
        justify-content: center;
        align-items: center;
    }

    .tooltip {
        margin-left: 1rem;
        text-align: left;
        font-size: 1.75rem;

        ::v-deep .tooltip-box {
            width: 28rem;

            box-shadow:
                0px 18px 38px nimiq-blue(0.07),
                0px 7px 8.5px nimiq-blue(0.04),
                0px 2px 2.5px nimiq-blue(0.02);
        }

        strong {
            font-weight: 600;
        }
    }
</style>
