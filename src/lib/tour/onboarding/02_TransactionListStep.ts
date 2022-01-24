import { useTransactionsStore } from '@/stores/Transactions';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';

export function getTransactionListStep(
    { root, steps, toggleDisabledAttribute }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
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
        lifecycle: {
            mounted: () => {
                const { transactions } = useTransactionsStore().state;

                if (Object.values(transactions.value || []).length === 0) {
                    const unwatch = root.$watch(() => useTransactionsStore().state.transactions, (txs) => {
                        if (!Object.values(txs).length) {
                            unwatch();
                            return;
                        }

                        // Once the user has at least one transaction, step TRANSACTIONS_LIST is modified
                        steps[OnboardingTourStep.TRANSACTIONS_LIST]!.tooltip = {
                            target: '.vue-recycle-scroller__item-wrapper',
                            content: ['This is where all your transactions will appear.'],
                            params: {
                                placement: 'bottom',
                            },
                        };
                        steps[OnboardingTourStep.TRANSACTIONS_LIST]!.ui.isNextStepDisabled = false;
                        toggleDisabledAttribute('.address-overview .transaction-list a button', true);
                        steps[OnboardingTourStep.TRANSACTIONS_LIST]!.lifecycle = {
                            created: async () => {
                                await toggleDisabledAttribute(
                                    '.address-overview .transaction-list a button', true);
                            },
                            mounted() {
                                return (args) => {
                                    if (args?.ending || !args?.goingForward) {
                                        setTimeout(() => {
                                            toggleDisabledAttribute(
                                                '.address-overview .transaction-list a button', false);
                                        }, args?.ending ? 0 : 1000);
                                    }
                                };
                            },
                        };
                        unwatch();
                    });
                }
            },
        },
        ui: {
            fadedElements: [
                '.address-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.address-overview .actions-mobile',
                '.address-overview .active-address',
            ],
            isNextStepDisabled: true,
        },
    };
}
