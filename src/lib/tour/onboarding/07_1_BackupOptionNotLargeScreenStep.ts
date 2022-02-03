import { IWalletHTMLElements } from '..';
import { IOnboardingGetStepFnArgs, OnboardingTourStep, ITourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBackupOptionNotLargeScreenStep({ isSmallScreen }: IOnboardingGetStepFnArgs): ITourStep {
    const ui: ITourStep['ui'] = {
        fadedElements: [
            IWalletHTMLElements.SIDEBAR_TESTNET,
            IWalletHTMLElements.SIDEBAR_LOGO,
            IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
            IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            IWalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            IWalletHTMLElements.SIDEBAR_NETWORK,
            IWalletHTMLElements.SIDEBAR_SETTINGS,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            IWalletHTMLElements.SIDEBAR_MOBILE_TAP_AREA,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledButtons: [
            IWalletHTMLElements.BUTTON_SIDEBAR_BUY,
            IWalletHTMLElements.BUTTON_SIDEBAR_SELL,
            IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
    };

    return {
        path: '/accounts?sidebar=true',
        tooltip: {
            target: `${IWalletHTMLElements.MODAL_PAGE} .current-account .item:nth-child(3)
                    ${isSmallScreen.value ? 'svg' : ''}`,
            content: getOnboardingTexts(
                OnboardingTourStep.BACKUP_OPTION_NOT_LARGE_SCREENS).default,
            params: {
                get placement() {
                    return isSmallScreen.value ? 'top-start' : 'right';
                },
            },
        },
        ui,
    } as ITourStep;
}
