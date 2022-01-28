import { WalletHTMLElements } from '..';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBackupOptionNotLargeScreenStep(
    { closeAccountOptions, openAccountOptions, isANewUser, isSmallScreen }
        : GetStepFnArgs<OnboardingTourStep>): TourStep {
    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
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
            WalletHTMLElements.ADDRESS_OVERVIEW,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
    };

    return {
        path: '/?sidebar=true',
        tooltip: {
            target: `${WalletHTMLElements.MODAL_PAGE} .current-account .item:nth-child(3)
                    ${isSmallScreen.value ? 'svg' : ''}`,
            content: getOnboardingTexts(
                OnboardingTourStep.BACKUP_OPTION_NOT_LARGE_SCREENS, isANewUser).default,
            params: {
                placement: isSmallScreen.value ? 'top-start' : 'right',
            },
        },
        ui,
        lifecycle: {
            mounted: async ({ goingForward }) => {
                if (!goingForward) {
                    await openAccountOptions();
                }

                return async ({ goingForward: goingForwardOnNextStep }) => {
                    if (goingForwardOnNextStep) {
                        await closeAccountOptions();
                    }
                };
            },
        },
    } as TourStep;
}
