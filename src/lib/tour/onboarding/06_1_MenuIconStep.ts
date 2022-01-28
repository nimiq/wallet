import { WalletHTMLElements } from '..';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getMenuIconStep({ isANewUser }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: '/',
        tooltip: {
            target: `${WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR} > button.reset`,
            content: getOnboardingTexts(OnboardingTourStep.MENU_ICON, isANewUser).default,
            params: {
                placement: 'bottom-start',
            },
        },
        lifecycle: {
            mounted: async ({ goToNextStep }) => {
                const hamburguerIcon = document.querySelector(
                    `${WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR} > button.reset`) as HTMLButtonElement;

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
                WalletHTMLElements.ADDRESS_OVERVIEW,
            ],
            disabledButtons: [
                WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            ],
            isNextStepDisabled: true,
        },
    } as TourStep;
}
