import { searchComponentByName } from '..';
import { OnboardingGetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getWalletBalanceStep({ isSmallScreen, root }: OnboardingGetStepFnArgs): TourStep {
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
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
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
    const instance = searchComponentByName(root, 'balance-distribution') as any;
    const hasBitcoin = instance.btcAccountBalance > 0;

    return {
        path: '/',
        tooltip: {
            get target() {
                return `${WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE} .balance-distribution`;
            },
            content: getOnboardingTexts(OnboardingTourStep.WALLET_BALANCE)[!hasBitcoin ? 'default' : 'alternative'],
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom' : 'right';
                },
                get modifiers() {
                    // if (isSmallScreen.value) {
                    return [{
                        name: 'preventOverflow',
                        options: {
                            mainAxis: false,
                            padding: 8,
                        },
                    }];
                    // }
                    // return undefined;
                },
            },
        },
        ui,
    } as TourStep;
}
