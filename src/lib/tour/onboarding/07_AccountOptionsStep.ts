import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getAccountOptionsStep({ isTablet, sleep, root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const onClickBackdrop = (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
    };
    const toggleBackdropInteractivity = async (allow: boolean) => {
        const backdrop = document.querySelector('.modal.backdrop') as HTMLDivElement;
        const action = allow ? 'addEventListener' : 'removeEventListener';

        backdrop[action]('click', onClickBackdrop, true);
        await root.$nextTick();
    };

    const stepForSmallScreens = {
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
                '.modal .wrapper',
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

                const backdrop = document.querySelector('.modal.backdrop') as HTMLDivElement;
                backdrop.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                }, { capture: true });

                return async () => {
                    const closeBtn = (document.querySelector('.modal .close-button') as HTMLDivElement);
                    closeBtn.click();
                    await sleep(200); // TODO Check this random value
                };
            },
        },
    } as TourStep;

    const stepForLargeScreens = {
        path: '/',
        tooltip: {
            target: '.modal .small-page',
            content: onboardingTexts[OnboardingTourStep.ACCOUNT_OPTIONS].default,
            params: {
                placement: 'right',
            },
        },
        ui: {
            disabledElements: [
                '.modal .wrapper', // TODO Show cursor not-allowed
            ],
            disabledButtons: [
                '.address-overview .transaction-list a button',
            ],
        },
        lifecycle: {
            created: async () => {
                await sleep(200); // TODO Check this random value
                const account = document.querySelector('.sidebar .account-menu') as HTMLButtonElement;
                account.click();
            },
            mounted: async () => {
                await toggleBackdropInteractivity(true);

                return async () => {
                    // TODO
                    // await toggleBackdropInteractivity(false);
                    // const backdrop = document.querySelector('.modal.backdrop') as HTMLDivElement;
                    // backdrop.click();
                    // await sleep(200); // TODO Check this random value
                };
            },
        },
    } as TourStep;

    return isTablet.value ? stepForSmallScreens : stepForLargeScreens;
}
