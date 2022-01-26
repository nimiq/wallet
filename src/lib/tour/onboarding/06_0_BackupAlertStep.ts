import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getBackupAlertStep({ isMobile }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return isMobile.value ? {
        path: '/',
        tooltip: {
            target: '.account-overview .backup-warning button',
            content: onboardingTexts[OnboardingTourStep.BACKUP_ALERT].default,
            params: {
                placement: 'bottom',
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
            ],
        },
    } : {
        path: '/',
        tooltip: {
            target: '.account-overview .backup-warning',
            content: onboardingTexts[OnboardingTourStep.BACKUP_ALERT].default,
            params: {
                placement: 'right',
            },
        },
        ui: {
            fadedElements: ['.sidebar'],
            disabledElements: [
                '.account-overview',
            ],
            disabledButtons: ['.address-overview .transaction-list a button'],
        },
    };
}
