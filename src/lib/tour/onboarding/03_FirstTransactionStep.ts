import { useTransactionsStore } from '@/stores/Transactions';
import { WalletHTMLElements } from '..';
import { OnboardingGetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getFirstTransactionStep({ isSmallScreen }: OnboardingGetStepFnArgs): TourStep {
    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
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
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
            WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
        scrollLockedElements: [`${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} .vue-recycle-scroller `],
    };
    const txsLen = () => Object.values(useTransactionsStore().state.transactions).length;

    return {
        get path() {
            return isSmallScreen.value ? '/transactions' : '/';
        },
        tooltip: {
            get target() {
                return `${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} ${isSmallScreen.value
                    ? '.transaction > .identicon'
                    : '.vue-recycle-scroller__item-view:nth-child(2)'}`;
            },
            content: getOnboardingTexts(OnboardingTourStep.FIRST_TRANSACTION)[
                txsLen() === 1 ? 'default' : 'alternative'],
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom-start' : 'left';
                },
            },
        },
        ui,
    } as TourStep;
}
