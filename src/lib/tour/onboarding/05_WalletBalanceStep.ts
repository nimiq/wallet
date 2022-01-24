import { OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getWalletBalanceStep(): TourStep {
    return {
        path: '/',
        tooltip: {
            target: '.account-overview .account-balance-container .amount',
            content: onboardingTexts[OnboardingTourStep.WALLET_BALANCE].default,
            params: {
                placement: 'bottom',
            },
        },
        ui: {
            fadedElements: [
                '.account-overview .backup-warning',
                '.account-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.account-overview .mobile-menu-bar',
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .bitcoin-account',
            ],
        },
    } as TourStep;
}
