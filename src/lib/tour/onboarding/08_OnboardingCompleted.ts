import { useAccountStore } from '@/stores/Account';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getOnboardingCompletedStep({ root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: '/?sidebar=true',
        tooltip: {
            target: '.column-sidebar .network .consensus-icon',
            content: onboardingTexts[OnboardingTourStep.ONBOARDING_COMPLETED].default,
            params: {
                placement: 'top-start',
            },
            button: {
                text: 'Go to Network',
                fn: () => {
                    const { setTour } = useAccountStore();
                    setTour(null);
                    root.$router.push('/network');
                },
            },
        },
        ui: {
            disabledElements: [
                '.column-sidebar',
            ],
        },
    } as TourStep;
}
