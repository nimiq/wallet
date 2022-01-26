import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getBitcoinAddressStep({ isMobile }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: '/',
        tooltip: {
            target: `.account-overview .bitcoin-account ${isMobile.value ? '> .bitcoin-account-item > svg' : ''}`,
            content: onboardingTexts[OnboardingTourStep.BITCOIN_ADDRESS].default,
            params: {
                placement: isMobile.value ? 'top-start' : 'right-end',
            },
        },
        ui: isMobile.value ? {
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
        } : {
            fadedElements: [
                '.sidebar',
                '.account-overview .backup-warning',
                '.account-overview .mobile-menu-bar',
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .mobile-action-bar',
            ],
            disabledButtons: [
                '.address-overview .transaction-list a button',
            ],
            disabledElements: [
                '.account-overview .bitcoin-account',
                '.address-overview',
            ],
        },
    } as TourStep;
}
