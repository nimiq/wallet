<template>
    <span v-if="data.htlc && data.htlc.settlement" class="oasis-payout-status">
        <span v-if="data.htlc.settlement.status === SettlementStatus.PENDING
            || data.htlc.settlement.status === SettlementStatus.ACCEPTED" class="nq-light-blue">
            {{ $t('{currency} payout pending', { currency: data.asset }) }}
        </span>
        <span v-if="data.htlc.settlement.status === SettlementStatus.DENIED" class="nq-orange">
            {{ $t('Waiting for {currency}', { currency: data.asset }) }}
        </span>
        <span v-if="data.htlc.settlement.status === SettlementStatus.FAILED" class="nq-orange">
            {{ $t('{currency} not paid out', { currency: data.asset }) }}
        </span>
    </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { SettlementStatus } from '@nimiq/oasis-api';
import { SwapEurData } from '../stores/Swaps';

export default defineComponent({
    props: {
        data: {
            type: Object as () => SwapEurData,
            required: true,
        },
    },
    setup() {
        return {
            SettlementStatus,
        };
    },
});
</script>

<style lang="scss" scoped>

</style>
