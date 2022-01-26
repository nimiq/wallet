import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getFirstTransactionStep({ isMobile }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const stepForMobile = {
        path: '/transactions',
        tooltip: {
            target: '.transaction-list .list-element > .transaction > .identicon',
            content: onboardingTexts[OnboardingTourStep.FIRST_TRANSACTION].default,
            params: {
                placement: 'bottom-start',
            },
        },
        ui: {
            fadedElements: [
                '.address-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.address-overview',
            ],
            disabledButtons: ['.address-overview .transaction-list a button'],
        },
    } as TourStep;

    const stepForNotMobile = {
        path: '/transactions',
        tooltip: {
            target: '.address-overview .transaction-list .vue-recycle-scroller__item-view:nth-child(2)',
            content: onboardingTexts[OnboardingTourStep.FIRST_TRANSACTION].default,
            params: {
                placement: 'left',
            },
        },
        ui: {
            disabledElements: [
                '.address-overview',
            ],
            fadedElements: [
                '.sidebar',
                '.account-overview .backup-warning',
                '.account-overview .account-balance-container',
                '.account-overview .address-list',
                '.account-overview .bitcoin-account',
            ],
            disabledButtons: ['.address-overview .transaction-list a button'],
        },
    } as TourStep;

    return isMobile.value ? stepForMobile : stepForNotMobile;
}
