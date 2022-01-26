import { useAccountStore } from '@/stores/Account';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getOnboardingCompletedStep({ root, isTablet }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: isTablet.value ? '/?sidebar=true' : '/',
        tooltip: {
            target: `.sidebar .network ${isTablet.value ? '.consensus-icon' : 'span'}`,
            content: onboardingTexts[OnboardingTourStep.ONBOARDING_COMPLETED].default,
            params: {
                placement: isTablet.value ? 'top-start' : 'right',
            },
            button: {
                text: 'Go to Network',
                fn: async (endTour) => {
                    if (endTour) {
                        await endTour();
                    }
                    const { setTour } = useAccountStore();
                    setTour('network');
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
