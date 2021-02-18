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
            <BankCheckInput v-model="bankName"
                @bank-selected="onBankSelected"
                :placeholder="$t('Enter bank name')"
                :title="$t('Enter bank name')"
                :class="{ writing }"
                ref="$bankCheckInput"
            />
            <span class="bic-too">{{ $t('BIC works, too.') }}</span>
            <div class="flex-grow"></div>
        </PageBody>
        <PageFooter>
            <span>{{ $t('Your bank is not eligible?') }}</span>
            <button class="nq-button-s" @click="$router.replace('/moonpay')" @mousedown.prevent>
                {{ $t('Buy with Credit Card') }}
            </button>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import { BankInfos } from '@/stores/Swaps';
import BankCheckInput from '../../BankCheckInput.vue';

export default defineComponent({
    setup(props, context) {
        const $bankCheckInput = ref<typeof BankCheckInput & { focus(): void } | null>(null);
        const bankName = ref('');

        const writing = computed(() => bankName.value.length !== 0);

        function onBankSelected(bank: BankInfos) {
            context.emit('bank-selected', bank);
        }

        onMounted(async () => {
            await context.root.$nextTick();
            if ($bankCheckInput.value) $bankCheckInput.value.focus();
        });

        return {
            $bankCheckInput,
            bankName,
            onBankSelected,
            writing,
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
        z-index: 2;
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
