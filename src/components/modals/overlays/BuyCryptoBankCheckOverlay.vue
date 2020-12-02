<template>
    <div class="buy-crypto-bank-check-overlay flex-column">
        <PageHeader>
            {{ $t('Is your bank eligible?') }}
            <div slot="more">{{ $t('You need a SEPA account that supports instant transactions.') }}</div>
        </PageHeader>
        <PageBody class="flex-column">
            <BankCheckInput v-model="bankName" :placeholder="$t('Enter bank name...')" @bank-selected="onBankSelected"/>
        </PageBody>
        <PageFooter>
            <span>{{ $t('Your bank is not eligible?') }}</span>
            <button class="nq-button-s">{{ $t('Buy with credit card') }}</button>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import BankCheckInput, { BankInfos } from '../../BankCheckInput.vue';

export default defineComponent({
    setup(props, context) {
        const bankName = ref('');

        function onBankSelected(bank: BankInfos) {
            context.emit('bank-selected', bank);
        }

        return {
            bankName,
            onBankSelected,
        };
    },
    components: {
        PageHeader,
        PageBody,
        PageFooter,
        BankCheckInput,
    },
});
</script>

<style lang="scss" scoped>
.buy-crypto-bank-check-overlay {
    height: 100%;
}

.page-header {
    /deep/ h1 {
        margin-bottom: 1rem;
    }
}

.page-body {
    overflow: visible;
}

.page-footer {
    padding: 3rem;

    span {
        color: var(--text-70);
    }
}

.nq-button-s {
    margin: {
        left: auto;
        right: auto;
        top: 1rem;
    };
}
</style>
