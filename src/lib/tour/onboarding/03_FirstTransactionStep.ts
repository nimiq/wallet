import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getFirstTransactionStep(
    { toggleDisabledAttribute }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: '/transactions',
        tooltip: {
            target: '.transaction-list .list-element > .transaction > .identicon',
            content: onboardingTexts[OnboardingTourStep.FIRST_TRANSACTION].default,
            params: {
                placement: 'bottom-start',
            },
        },
        lifecycle: {
            created: async () => {
                await toggleDisabledAttribute('.address-overview .transaction-list a button', true);
            },
            mounted() {
                return (args) => {
                    if (args?.ending || args?.goingForward) {
                        setTimeout(() => {
                            toggleDisabledAttribute('.address-overview .transaction-list a button', false);
                        }, args?.ending ? 0 : 1000);
                    }
                };
            },
        },
        ui: {
            fadedElements: [
                '.address-overview .mobile-action-bar',
            ],
            disabledElements: [
                '.address-overview',
            ],
        },
    } as TourStep;
}
