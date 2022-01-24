import { OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getBackupAlertStep(): TourStep {
    return {
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
    } as TourStep;
}
