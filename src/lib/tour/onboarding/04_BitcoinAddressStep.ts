import { GetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getBitcoinAddressStep(
    { isSmallScreen, isMediumScreen }: GetStepFnArgs<OnboardingTourStep>): TourStep {
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
            target: `.account-overview .bitcoin-account ${isSmallScreen.value || isMediumScreen.value
                ? '> .bitcoin-account-item > svg' : ''}`,
            content: onboardingTexts[OnboardingTourStep.BITCOIN_ADDRESS].default,
            params: {
                placement: isSmallScreen.value || isMediumScreen.value ? 'top-start' : 'right-end',
                // TODO Add margin in large screens
            },
        },
        ui,
    } as TourStep;
}
