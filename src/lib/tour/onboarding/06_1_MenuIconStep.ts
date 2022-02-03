import { IWalletHTMLElements } from '..';
import { OnboardingTourStep, ITourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getMenuIconStep(): ITourStep {
    return {
        path: '/',
        tooltip: {
            target: `${IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR} > button.reset`,
            content: getOnboardingTexts(OnboardingTourStep.MENU_ICON).default,
            params: {
                placement: 'bottom-start',
            },
        },
        lifecycle: {
            mounted: async ({ goToNextStep }) => {
                const hamburguerIcon = document.querySelector(
                    `${IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR} > button.reset`) as HTMLButtonElement;

                hamburguerIcon!.addEventListener('click', () => goToNextStep(), { once: true, capture: true });
            },
        },
        ui: {
            fadedElements: [
                IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            ],
            disabledElements: [
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
                IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            ],
            isNextStepDisabled: true,
        },
    } as ITourStep;
}
