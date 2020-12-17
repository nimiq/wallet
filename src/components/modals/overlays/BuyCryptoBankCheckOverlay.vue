<template>
    <div class="buy-crypto-bank-check-overlay flex-column">
        <PageHeader :backArrow="true" @back="back">
            {{ $t('Is your bank eligible?') }}
            <div slot="more">{{ $t('You need a SEPA account that supports instant transactions.') }}</div>
        </PageHeader>
        <PageBody class="flex-column">
            <BankCheckInput v-model="bankName" :placeholder="$t('Enter bank name...')" @bank-selected="onBankSelected"/>
            <span>{{ $t('BIC work too.') }}</span>
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
import { BankInfos } from '@/stores/Swaps';
import BankCheckInput from '../../BankCheckInput.vue';

export default defineComponent({
    setup(props, context) {
        const bankName = ref('');

        function onBankSelected(bank: BankInfos) {
            context.emit('bank-selected', bank);
        }

        function back() {
            context.emit('back');
        }

        return {
            bankName,
            onBankSelected,
            back,
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
    text-align: center;
}

.page-header {
    /deep/ h1 {
        margin-bottom: 1rem;
    }
}

.page-body {
    overflow: visible;
    padding-top: 10.375rem;

    .bank-check-input {
        transition: transform 300ms var(--nimiq-ease);

        &.writing {
            transform: translateY(-100%);
            & + span {
                opacity: 0;
                visibility: hidden;
                user-select: none;
            }
        }
    }

    & > span {
        font-size: var(--small-size);
        color: var(--text-40);
        margin-top: 1rem;

        transition-property: opacity, visibility;
        transition-duration: 300ms;
        transition-timing-function: var(--nimiq-ease);
    }
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
