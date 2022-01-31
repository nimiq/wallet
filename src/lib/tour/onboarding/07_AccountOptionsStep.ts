import { WalletHTMLElements } from '..';
import { OnboardingGetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

type AccountStep = OnboardingGetStepFnArgs & { keepMenuOpenOnForward: boolean };
export function getAccountOptionsStep(
    { isSmallScreen, isLargeScreen, isANewUser, openAccountOptions, closeAccountOptions, keepMenuOpenOnForward }
        : AccountStep): TourStep {
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
        get path() {
            return isLargeScreen.value ? '/' : '/?sidebar=true';
        },
        tooltip: {
            target: WalletHTMLElements.MODAL_PAGE,
            content: getOnboardingTexts(OnboardingTourStep.ACCOUNT_OPTIONS, isANewUser).default,
            params: {
                get placement() {
                    return isSmallScreen.value ? 'top' : 'right';
                },
            },
        },
        ui,
        lifecycle: {
            mounted: async () => {
                await openAccountOptions();

                return async ({ goingForward }) => {
                    if (!goingForward || !keepMenuOpenOnForward) {
                        await closeAccountOptions();
                    }
                };
            },
        },
    } as TourStep;
}
