import { ITourOrigin, IWalletHTMLElements } from '..';
import { IOnboardingGetStepFnArgs, OnboardingTourStep, ITourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBackupAlertStep(
    { isSmallScreen, startedFrom }: IOnboardingGetStepFnArgs): ITourStep {
    const ui: ITourStep['ui'] = {
        fadedElements: [
            IWalletHTMLElements.SIDEBAR_TESTNET,
            IWalletHTMLElements.SIDEBAR_LOGO,
            IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
            IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            IWalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            IWalletHTMLElements.SIDEBAR_NETWORK,
            IWalletHTMLElements.SIDEBAR_SETTINGS,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
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
        path: '/',
        tooltip: {
            target: isSmallScreen.value
                ? `${IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT} button`
                : IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            content: getOnboardingTexts(OnboardingTourStep.BACKUP_ALERT)[
                startedFrom === ITourOrigin.WELCOME_MODAL ? 'default' : 'alternative'] || [],
            params: {
                placement: isSmallScreen.value ? 'bottom' : 'right',
            },
        },
        ui,
    };
}
