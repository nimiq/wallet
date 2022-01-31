import { OnboardingGetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBitcoinAddressStep(
    { isLargeScreen, isANewUser }: OnboardingGetStepFnArgs): TourStep {
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
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
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
                return `.account-overview .bitcoin-account ${!isLargeScreen.value
                    ? '> .bitcoin-account-item > svg' : ''}`;
            },
            content: getOnboardingTexts(OnboardingTourStep.BITCOIN_ADDRESS, isANewUser).default,
            params: {
                get placement() {
                    // TODO Add margin in large screens
                    return !isLargeScreen.value ? 'bottom-start' : 'left';
                },
            },
        },
        ui,
    } as TourStep;
}
