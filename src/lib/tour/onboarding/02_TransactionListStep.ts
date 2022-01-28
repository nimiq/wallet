import { useTransactionsStore } from '@/stores/Transactions';
import { WalletHTMLElements } from '..';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getTransactionListStep(
    { root, steps, isSmallScreen, isANewUser }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const txs = useTransactionsStore().state.transactions;
    const startsWithNoTransactions = Object.values(txs).length === 0;

    const tooltipWhenNoTx: TourStep['tooltip'] = {
        target: isSmallScreen.value
            ? `${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} > .empty-state h2`
            : WalletHTMLElements.ADDRESS_OVERVIEW,
        content: getOnboardingTexts(OnboardingTourStep.TRANSACTIONS_LIST, isANewUser).default,
        params: {
            placement: isSmallScreen.value ? 'top' : 'left',
        },
    };
    const tooltipWhenAtLeastOneTx: TourStep['tooltip'] = {
        target: isSmallScreen.value
            ? '.vue-recycle-scroller__item-wrapper'
            : WalletHTMLElements.ADDRESS_OVERVIEW,
        content: getOnboardingTexts(OnboardingTourStep.TRANSACTIONS_LIST, isANewUser).alternative || [],
        params: {
            placement: isSmallScreen.value ? 'bottom' : 'left',
        },
    };

    let userHasClicked = false;
    const highlightButton = (highlight: boolean) => {
        if (userHasClicked) return;

        const receiveNim = document
            .querySelector(WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM) as HTMLButtonElement;
        if (!receiveNim) return;
        receiveNim.classList[highlight ? 'add' : 'remove']('highlighted');
    };
    const mounted = () => {
        const { transactions } = useTransactionsStore().state;

        if (Object.values(transactions.value || []).length === 0) {
            const unwatch = root.$watch(() => txs, () => {
                if (!Object.values(txs).length) {
                    unwatch();
                    return;
                }

                userHasClicked = true;

                const buyNimBtn = document
                    .querySelector(`${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} a button`) as HTMLButtonElement;
                buyNimBtn.disabled = true;

                // Once the user has at least one transaction, step TRANSACTIONS_LIST is modified
                steps[OnboardingTourStep.TRANSACTIONS_LIST]!.tooltip = tooltipWhenAtLeastOneTx;
                steps[OnboardingTourStep.TRANSACTIONS_LIST]!.ui.isNextStepDisabled = false;
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
        isNextStepDisabled: startsWithNoTransactions,
    };

    return {
        path: isSmallScreen.value ? '/transactions' : '/',
        tooltip: startsWithNoTransactions ? tooltipWhenNoTx : tooltipWhenAtLeastOneTx,
        lifecycle: startsWithNoTransactions ? { mounted } : {},
        ui,
    };
}
