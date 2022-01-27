import { useTransactionsStore } from '@/stores/Transactions';
import { WalletHTMLElements } from '..';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getTransactionListStep(
    { root, steps, isSmallScreen, isLargeScreen }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    let userHasClicked = false;
    const highlightButton = (highlight: boolean) => {
        if (userHasClicked) return;

        const receiveNim = document
            .querySelector(WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM) as HTMLButtonElement;
        receiveNim.classList[highlight ? 'add' : 'remove']('highlighted');
    };
    const mounted = () => {
        const { transactions } = useTransactionsStore().state;

        if (Object.values(transactions.value || []).length === 0) {
            const unwatch = root.$watch(() => useTransactionsStore().state.transactions, (txs) => {
                if (!Object.values(txs).length) {
                    unwatch();
                    return;
                }

                userHasClicked = true;

                const buyNimBtn = document
                    .querySelector(`${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} a button`) as HTMLButtonElement;
                buyNimBtn.disabled = true;

                // Once the user has at least one transaction, step TRANSACTIONS_LIST is modified
                if (isSmallScreen.value) {
                    steps[OnboardingTourStep.TRANSACTIONS_LIST]!.tooltip = {
                        target: '.vue-recycle-scroller__item-wrapper',
                        content: onboardingTexts[OnboardingTourStep.TRANSACTIONS_LIST].alternative || [],
                        params: {
                            placement: 'bottom',
                        },
                    };
                } else {
                    steps[OnboardingTourStep.TRANSACTIONS_LIST]!.tooltip = {
                        ...steps[OnboardingTourStep.TRANSACTIONS_LIST]!.tooltip,
                        content: onboardingTexts[OnboardingTourStep.TRANSACTIONS_LIST].alternative || [],
                    };
                }
                steps[OnboardingTourStep.TRANSACTIONS_LIST]!.ui = {
                    ...steps[OnboardingTourStep.TRANSACTIONS_LIST]!.ui,
                    isNextStepDisabled: false,
                };
                steps[OnboardingTourStep.TRANSACTIONS_LIST]!.lifecycle = {};

                unwatch();
            });
        }
        highlightButton(true);
        return () => highlightButton(false);
    };

    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            WalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            WalletHTMLElements.SIDEBAR_NETWORK,
            WalletHTMLElements.SIDEBAR_SETTINGS,
            WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
        isNextStepDisabled: true,
    };

    return {
        path: isSmallScreen.value ? '/transactions' : '/',
        tooltip: {
            target: isSmallScreen.value
                ? `${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} > .empty-state h2`
                : WalletHTMLElements.ADDRESS_OVERVIEW,
            content: onboardingTexts[OnboardingTourStep.TRANSACTIONS_LIST].default,
            params: {
                placement: isSmallScreen.value ? 'top' : 'left',
            },
        },
        lifecycle: { mounted },
        ui,
    };
}
