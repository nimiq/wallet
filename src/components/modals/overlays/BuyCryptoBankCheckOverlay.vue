<template>
    <div class="buy-crypto-bank-check-overlay flex-column">
        <PageHeader>
            {{ $t('Is your bank eligible?') }}
            <div slot="more" class="header-notice">
                {{ $t('You need a SEPA account that supports instant transactions.') }}
            </div>
        </PageHeader>
        <PageBody class="flex-column">
            <div class="flex-grow"></div>
            <BankCheckInput v-model="bankName" :placeholder="$t('Enter bank name...')" @bank-selected="onBankSelected"/>
            <span class="bic-too">{{ $t('BIC works, too.') }}</span>
            <div class="flex-grow"></div>
        </PageBody>
        <PageFooter>
            <span>{{ $t('Your bank is not eligible?') }}</span>
            <a class="nq-button-s" href="https://nimiq.com/exchanges" target="_blank" @mousedown.prevent>
                {{ $t('Buy on on exchange') }}
            </a>
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
    text-align: center;
}

.page-header {
    /deep/ h1 {
        margin-bottom: 1rem;
    }

    .header-notice {
        font-size: var(--body-size);
        max-width: 42rem;
        margin: 1.25rem auto 0;
    }
}

.page-body {
    overflow: visible;

    .flex-grow:last-child {
        flex-grow: 2;
    }

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

    .bic-too {
        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-40);
        margin-top: 1rem;

        transition-property: opacity, visibility;
        transition-duration: 300ms;
        transition-timing-function: var(--nimiq-ease);
    }
}

.page-footer {
    padding-bottom: 3rem;

    span {
        font-size: var(--body-size);
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
