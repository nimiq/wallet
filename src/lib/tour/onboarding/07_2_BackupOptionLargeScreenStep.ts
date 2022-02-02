import { WalletHTMLElements } from '..';
import { OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBackupOptionLargeScreenStep(): TourStep {
    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
            WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            WalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            WalletHTMLElements.SIDEBAR_NETWORK,
            WalletHTMLElements.SIDEBAR_SETTINGS,
            WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            WalletHTMLElements.SIDEBAR_MOBILE_TAP_AREA,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
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
    };

    return {
        path: '/',
        tooltip: {
            target: WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            content: getOnboardingTexts(OnboardingTourStep.BACKUP_OPTION_LARGE_SCREENS).default,
            params: {
                placement: 'right',
            },
        },
        ui,
    } as TourStep;
}
