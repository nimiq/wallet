import { OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getMenuIconStep(): TourStep {
    return {
        path: '/',
        tooltip: {
            target: '.account-overview .mobile-menu-bar > button.reset',
            content: onboardingTexts[OnboardingTourStep.MENU_ICON].default,
            params: {
                placement: 'bottom-start',
            },
        },
        lifecycle: {
            mounted: async ({ goToNextStep }) => {
                const hamburguerIcon = document
                    .querySelector('.account-overview .mobile-menu-bar > button.reset') as HTMLButtonElement;

                hamburguerIcon!.addEventListener('click', () => goToNextStep(), { once: true, capture: true });
            },
        },
        ui: {
            fadedElements: [
                '.account-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .bitcoin-account',
                '.address-overview',
            ],
            disabledButtons: [
                '.address-overview .transaction-list a button',
            ],
            isNextStepDisabled: true,
        },
    } as TourStep;
}
