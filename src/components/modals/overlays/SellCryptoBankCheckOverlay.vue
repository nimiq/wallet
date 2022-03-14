<template>
    <div class="sell-crypto-bank-check-overlay flex-column">
        <PageHeader>
            {{ $t('Enter your bank details') }}
            <div slot="more" class="header-notice">
                {{ $t('Without a SEPA instant bank account your money will take 1-3 business days to arrive.') }}
            </div>
        </PageHeader>
        <PageBody class="flex-column">
            <DoubleInput extended>
                <template #second>
                    <LabelInput
                        v-model="accountName"
                        ref="$accountNameInput"
                        :placeholder="$t('Enter account holder name')"
                        @keydown.native="onIbanInputKeyDown"
                    />
                </template>

                <template #main>
                    <LabelInput
                        v-model="iban"
                        ref="$ibanInput"
                        :placeholder="$t('Enter IBAN')"
                        @keydown.native="onIbanInputKeyDown"
                    />
                </template>

                <template #message>
                    <span v-if="!isIbanValid" class="nq-orange invalid-iban flex-row">
                        {{ $t('This is not a valid IBAN') }}
                    </span>
                    <!-- <span v-else-if="!isIbanCountryValid" class="nq-orange invalid-iban flex-row">
                        {{ $t('This IBAN is for a different country than the bank') }}
                    </span> -->
                </template>
            </DoubleInput>
            <!-- <div class="bank flex-row">
                <BankIcon/><a class="nq-link nq-blue">{{ computedBankName }}</a>
            </div> -->
        </PageBody>
        <PageFooter>
            <button
                class="nq-button light-blue"
                :disabled="!canConfirm"
                @click="confirm"
                @mousedown.prevent
            >{{ $t('Confirm account') }}</button>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, LabelInput } from '@nimiq/vue-components';
import IBAN from 'iban';
import DoubleInput from '../../DoubleInput.vue';
// import BankIcon from '../../icons/BankIcon.vue';
import { BankAccount, useBankStore } from '../../../stores/Bank';

export default defineComponent({
    setup(props, context) {
        const { bankAccounts } = useBankStore();

        const $accountNameInput = ref<typeof LabelInput & { focus(): void } | null>(null);
        const $ibanInput = ref<typeof LabelInput & { focus(): void } | null>(null);

        const accountName = ref(bankAccounts.value.sepa?.accountName || '');
        const iban = ref(bankAccounts.value.sepa?.iban || '');

        const isIbanValid = computed(() => iban.value.length < 5 || IBAN.isValid(iban.value));
        // const isIbanCountryValid = computed(() => iban.value.length < 2
        //     || EU_COUNTRIES.includes(iban.value.substring(0, 2).toUpperCase()));

        const canConfirm = computed(() =>
            accountName.value.length > 0
                && iban.value.length >= 5
                && isIbanValid.value
                /* && isIbanCountryValid.value */,
        );

        function onIbanInputKeyDown(event: KeyboardEvent) {
            if (event.key === 'Enter' && canConfirm.value) {
                confirm();
            }
        }

        function confirm() {
            const bankAccount: BankAccount = {
                accountName: accountName.value,
                iban: iban.value,
            };

            context.emit('details-entered', bankAccount);
        }

        return {
            $accountNameInput,
            $ibanInput,

            accountName,
            iban,

            isIbanValid,
            // isIbanCountryValid,
            canConfirm,

            onIbanInputKeyDown,
            confirm,
        };
    },
    components: {
        PageHeader,
        PageBody,
        PageFooter,
        DoubleInput,
        LabelInput,
        // BankIcon,
    },
});
</script>

<style lang="scss" scoped>
.sell-crypto-bank-check-overlay {
    height: 100%;
    text-align: center;
}

.page-header {
    ::v-deep h1 {
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
    justify-content: center;

    .double-input {
        flex-grow: 1;

        ::v-deep .message {
            font-weight: 600;
            margin-top: .5rem;
            font-size: 1.75rem;

            > .nq-icon {
                margin-right: 0.5rem;
            }
        }
    }

    .label-input ::v-deep input {
        width: 100% !important;
        line-height: 2rem;
        font-size: 2rem;
        padding: 14px;
        margin: 0; // for ios safari
    }

    // .bank {
    //     justify-content: center;
    //     align-items: center;
    //     font-weight: 600;
    //     font-size: 2rem;
    //     margin-top: 3rem;

    //     &:hover {
    //         cursor: pointer;
    //     }

    //     .bank-icon {
    //         height: 24px;
    //         width: auto;
    //         margin-right: 1rem;
    //     }
    // }
}

.page-footer {
    height: 13.5rem;
}
</style>
