import { OnboardingGetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getWalletBalanceStep({ isSmallScreen, isANewUser }: OnboardingGetStepFnArgs): TourStep {
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
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            WalletHTMLElements.ADDRESS_OVERVIEW,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
    };

    return {
        path: '/',
        tooltip: {
            get target() {
                return `${WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE}
                ${isSmallScreen.value ? '.amount' : '.balance-distribution'}`;
            },
            content: getOnboardingTexts(OnboardingTourStep.WALLET_BALANCE, isANewUser).default,
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom' : 'right';
                },
            },
        },
        ui,
    } as TourStep;
}
