import { WalletHTMLElements } from '..';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getFirstTransactionStep({ isSmallScreen, isLargeScreen }: GetStepFnArgs<OnboardingTourStep>): TourStep {
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
            WalletHTMLElements.ADDRESS_OVERVIEW,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
    };

    return {
        path: isSmallScreen.value ? '/transactions' : '/',
        tooltip: {
            target: isSmallScreen.value
                ? `${WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} .transaction > .identicon`
                : `${WalletHTMLElements.ADDRESS_OVERVIEW} .vue-recycle-scroller__item-view:nth-child(2)`,
            content: onboardingTexts[OnboardingTourStep.FIRST_TRANSACTION].default,
            params: {
                placement: isSmallScreen.value ? 'bottom-start' : 'left',
            },
        },
        ui,
    } as TourStep;
}
