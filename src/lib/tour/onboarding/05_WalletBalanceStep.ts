import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getWalletBalanceStep({ isMobile }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: '/',
        tooltip: {
            target: `.account-overview .account-balance-container 
                    ${isMobile.value ? '.amount' : '.balance-distribution'}`,
            content: onboardingTexts[OnboardingTourStep.WALLET_BALANCE].default,
            params: {
                placement: isMobile.value ? 'bottom' : 'right',
            },
        },
        ui: isMobile.value ? {
            fadedElements: [
                '.sidebar',
                '.account-overview .backup-warning',
                '.account-overview .mobile-action-bar',
                '.address-overview',
            ],
            disabledElements: [
                '.account-overview .mobile-menu-bar',
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .bitcoin-account',
            ],
        } : {
            fadedElements: [
                '.sidebar',
                '.account-overview .backup-warning',
            ],
            disabledButtons: [
                '.address-overview .transaction-list a button',
            ],
            disabledElements: [
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .bitcoin-account',
                '.address-overview',
            ],
        },
    } as TourStep;
}
