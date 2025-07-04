<template>
    <div class="sell-crypto-bank-check-overlay flex-column">
        <PageHeader :backArrow="currentStep === Step.IBAN_CHECK" @back="goBack">
            <MessageTransition :reverse="currentStep === Step.BANK_CHECK">
                <template v-if="currentStep === Step.BANK_CHECK">
                    {{ $t('What is your bank called?') }}
                </template>
                <template v-else>
                    {{ $t('Enter your bank details') }}
                </template>
            </MessageTransition>
            <div slot="more" class="header-notice">
                {{ $t('Without a SEPA instant bank account your money will take 1-3 business days to arrive.') }}
            </div>
        </PageHeader>
        <PageBody class="flex-column">
            <MessageTransition :reverse="currentStep === Step.BANK_CHECK">
                <template v-if="currentStep === Step.BANK_CHECK">
                    <BankCheckInput v-model="bankName"
                        @bank-selected="onBankSelected"
                        direction="inbound"
                        :placeholder="$t('Enter bank name')"
                        :title="$t('Enter bank name')"
                        :class="{ writing }"
                        ref="bankCheckInput$"
                    />
                    <span class="bic-too">{{ $t('BIC works, too.') }}</span>
                </template>
                <template v-else>
                    <DoubleInput :extended="true">
                        <template #second>
                            <LabelInput
                                v-model="accountName"
                                ref="accountNameInput$"
                                :placeholder="$t('Enter account holder name')"
                                @keydown.native="onIbanInputKeyDown"
                            />
                        </template>

                        <template #main>
                            <LabelInput
                                v-model="iban"
                                :placeholder="$t('Enter IBAN')"
                                @keydown.native="onIbanInputKeyDown"
                            />
                        </template>

                        <template #message>
                            <span v-if="!isIbanValid" class="nq-orange invalid-iban flex-row">
                                {{ $t('This is not a valid IBAN') }}
                            </span>
                            <span v-else-if="!isIbanCountryValid" class="nq-orange invalid-iban flex-row">
                                {{ $t('This IBAN is for a different country than the bank') }}
                            </span>
                        </template>
                    </DoubleInput>
                    <div class="bank flex-row" @click="currentStep = Step.BANK_CHECK">
                        <BankIcon/><a class="nq-link nq-blue">{{ bank ? bank.name : '' }}</a>
                    </div>
                </template>
            </MessageTransition>
        </PageBody>
        <PageFooter>
            <transition name="fade">
                <button v-if="currentStep === Step.IBAN_CHECK"
                    class="nq-button light-blue"
                    :disabled="!canConfirm"
                    @click="confirm"
                    @mousedown.prevent
                >{{ $t('Confirm account') }}</button>
            </transition>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, nextTick } from 'vue';
import { PageHeader, PageBody, PageFooter, LabelInput } from '@nimiq/vue-components';
import { Bank } from '@nimiq/oasis-bank-list';
import IBAN from 'iban';
import { BankAccount, useBankStore } from '@/stores/Bank';
import BankCheckInput from '../../BankCheckInput.vue';
import MessageTransition from '../../MessageTransition.vue';
import DoubleInput from '../../DoubleInput.vue';
import BankIcon from '../../icons/BankIcon.vue';

enum Step {
    BANK_CHECK = 'bank-check-step',
    IBAN_CHECK = 'iban-check-step',
}

export default defineComponent({
    setup(props, context) {
        const { bank, bankAccount } = useBankStore();

        const bankCheckInput$ = ref<BankCheckInput | null>(null);
        const accountNameInput$ = ref<LabelInput | null>(null);

        const currentStep = ref<Step>(Step.BANK_CHECK);
        const bankName = ref(bank.value?.name || '');
        const accountName = ref(bankAccount.value?.accountName || '');
        const iban = ref(bankAccount.value?.iban || '');

        const isIbanValid = computed(() => iban.value.length < 5 || IBAN.isValid(iban.value));
        const isIbanCountryValid = computed(() => iban.value.length < 2
            || iban.value.substr(0, 2).toUpperCase() === bank.value?.country.toUpperCase(),
        );

        const writing = computed(() => bankName.value.length !== 0);
        const canConfirm = computed(() =>
            accountName.value.length > 0
                && iban.value.length >= 5
                && isIbanValid.value
                && isIbanCountryValid.value,
        );

        watch(currentStep, async () => {
            await nextTick();
            if (currentStep.value === Step.BANK_CHECK) {
                if (bankCheckInput$.value) bankCheckInput$.value.focus();
            } else if (currentStep.value === Step.IBAN_CHECK) {
                if (accountNameInput$.value) accountNameInput$.value.focus();
            }
        });

        watch(bank, () => {
            accountName.value = bankAccount.value?.accountName || '';
            iban.value = bankAccount.value?.iban || '';
        });

        function onBankSelected(selectedBank: Bank) {
            context.emit('bank-selected', selectedBank);
            currentStep.value = Step.IBAN_CHECK;
        }

        function onIbanInputKeyDown(event: KeyboardEvent) {
            if (event.key === 'Enter' && canConfirm.value) {
                confirm();
            }
        }

        function goBack() {
            currentStep.value = Step.BANK_CHECK;
        }

        function confirm() {
            const newBankAccount: BankAccount = {
                accountName: accountName.value,
                iban: iban.value,
            };

            context.emit('details-entered', newBankAccount);
        }

        return {
            Step,

            bankCheckInput$,
            accountNameInput$,

            bank,
            bankName,
            writing,
            currentStep,
            accountName,
            iban,

            isIbanValid,
            isIbanCountryValid,
            canConfirm,

            onBankSelected,
            onIbanInputKeyDown,
            goBack,
            confirm,
        };
    },
    components: {
        PageHeader,
        PageBody,
        PageFooter,
        BankCheckInput,
        MessageTransition,
        DoubleInput,
        LabelInput,
        BankIcon,
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

    ::v-deep .page-header-back-button {
        z-index: 3;
    }
}

.page-body {
    overflow: visible;
    justify-content: center;

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

            .bic-too {
                opacity: 0;
                visibility: hidden;
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

    .bank {
        justify-content: center;
        align-items: center;
        font-weight: 600;
        font-size: 2rem;
        margin-top: 3rem;

        &:hover {
            cursor: pointer;
        }

        .bank-icon {
            height: 24px;
            width: auto;
            margin-right: 1rem;
        }
    }
}

.page-footer {
    height: 13.5rem;
}

.fade-enter-active, .fade-leave-active {
    will-change: opacity;
    transition: {
        property: opacity;
        duration: 500ms;
        timing-function: cubic-bezier(0.5, 0, 0.15, 1);
    }
}

.fade-enter-active {
    transition-delay: 50ms;
}

.fade-leave,
.fade-enter-to {
    opacity: 1;
}

.fade-enter,
.fade-leave-to {
    opacity: 0;
}
</style>
