import { WalletHTMLElements } from '..';
import { OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getMenuIconStep(): TourStep {
    return {
        path: '/',
        tooltip: {
            target: `${WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR} > button.reset`,
            content: getOnboardingTexts(OnboardingTourStep.MENU_ICON).default,
            params: {
                placement: 'bottom-start',
            },
        },
        lifecycle: {
            mounted: async ({ goToNextStep }) => {
                const hamburguerIcon = document.querySelector(
                    `${WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR} > button.reset`) as HTMLButtonElement;

                hamburguerIcon!.addEventListener('click', () => goToNextStep(), { once: true, capture: true });
            },
        },
        ui: {
            fadedElements: [
                WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            ],
            disabledElements: [
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
                WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            ],
            isNextStepDisabled: true,
        },
    } as TourStep;
}
