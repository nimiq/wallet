import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getAccountOptionsStep({ sleep, root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    return {
        path: '/?sidebar=true',
        tooltip: {
            target: '.modal .small-page',
            content: onboardingTexts[OnboardingTourStep.ACCOUNT_OPTIONS].default,
            params: {
                placement: 'top',
            },
        },
        ui: {
            disabledElements: [
                '.column-sidebar',
            ],
        },
        lifecycle: {
            created: async () => {
                await sleep(500); // TODO Check this random value
                const account = document.querySelector('.sidebar .account-menu') as HTMLButtonElement;
                account.click();
                await sleep(500); // TODO Check this random value
            },
            mounted: async () => {
                const sidebar = (document.querySelector('.column-sidebar') as HTMLDivElement);
                sidebar!.removeAttribute('data-non-interactable');
                await root.$nextTick();

                return async () => {
                    const closeBtn = (document.querySelector('.modal .close-button') as HTMLDivElement);
                    closeBtn.click();

                    await sleep(500); // TODO Check this random value
                };
            },
        },
    } as TourStep;
}
