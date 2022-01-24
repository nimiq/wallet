import { OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getBitcoinAddressStep() {
    return {
        path: '/',
        tooltip: {
            target: '.account-overview .bitcoin-account > .bitcoin-account-item > svg',
            content: onboardingTexts[OnboardingTourStep.BITCOIN_ADDRESS].default,
            params: {
                placement: 'top-start',
            },
        },
        ui: {
            fadedElements: [
                '.account-overview .backup-warning',
                '.account-overview .mobile-menu-bar',
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.account-overview .bitcoin-account',
            ],
        },
    } as TourStep;
}
