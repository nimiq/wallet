import { useTransactionsStore } from '@/stores/Transactions';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';

export function getTransactionListStep(
    { root, steps, isMobile }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const mounted = () => {
        const { transactions } = useTransactionsStore().state;

        if (Object.values(transactions.value || []).length === 0) {
            const unwatch = root.$watch(() => useTransactionsStore().state.transactions, (txs) => {
                if (!Object.values(txs).length) {
                    unwatch();
                    return;
                }

                const buyNimBtn = document
                    .querySelector('.address-overview .transaction-list a button') as HTMLButtonElement;
                buyNimBtn.disabled = true;

                // Once the user has at least one transaction, step TRANSACTIONS_LIST is modified
                steps[OnboardingTourStep.TRANSACTIONS_LIST] = {
                    path: steps[OnboardingTourStep.TRANSACTIONS_LIST]?.path,
                    tooltip: {
                        target: '.vue-recycle-scroller__item-wrapper',
                        content: ['This is where all your transactions will appear.'],
                        params: {
                            placement: 'bottom',
                        },
                    },
                    ui: {
                        ...steps[OnboardingTourStep.TRANSACTIONS_LIST]!.ui,
                        isNextStepDisabled: false,
                    },
                } as TourStep;
                unwatch();
            });
        }
    };

    const stepForMobile: TourStep = {
        path: '/transactions',
        tooltip: {
            target: '.transaction-list > .empty-state h2',
            content: [
                'This is where all your transactions will appear.',
                'Click the green button to receive a free NIM from Team Nimiq.',
            ],
            params: {
                placement: 'top',
            },
        },
        lifecycle: { mounted },
        ui: {
            fadedElements: [
                '.address-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.address-overview .actions-mobile',
                '.address-overview .active-address',
            ],
            isNextStepDisabled: true,
            disabledButtons: ['.address-overview .transaction-list a button'],
        },
    };

    const stepForNotMobile: TourStep = {
        path: '/',
        tooltip: {
            target: '.address-overview',
            content: [
                'This is where all your transactions will appear.',
                'Click the green button to receive a free NIM from Team Nimiq.',
            ],
            params: {
                placement: 'left',
            },
        },
        lifecycle: { mounted },
        ui: {
            disabledElements: [
                '.address-overview',
            ],
            fadedElements: [
                '.sidebar',
                '.account-overview .backup-warning',
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .bitcoin-account',
            ],
            isNextStepDisabled: true,
            disabledButtons: ['.address-overview .transaction-list a button'],
        },
    };

    return isMobile.value ? stepForMobile : stepForNotMobile;
}
