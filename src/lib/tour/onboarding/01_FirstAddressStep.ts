import { CryptoCurrency } from '@/lib/Constants';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getFirstAddressStep({ isMobile, root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const created = () => {
        const { setActiveCurrency } = useAccountStore();
        const { addressInfos, selectAddress } = useAddressStore();
        setActiveCurrency(CryptoCurrency.NIM);
        selectAddress(addressInfos.value[0].address);
    };
    const path = '/';

    return isMobile.value
        ? {
            path,
            tooltip: {
                target: '.address-list > .address-button .identicon img',
                content: onboardingTexts[OnboardingTourStep.FIRST_ADDRESS].default,
                params: {
                    placement: 'bottom-start',
                },
            },
            lifecycle: {
                created,
                mounted: ({ goToNextStep }) => {
                    if (!isMobile) {
                        return undefined;
                    }

                    // Listener for the first address button only for mobile

                    const addressButton = document
                        .querySelector('.address-list > .address-button') as HTMLButtonElement;

                    let addressClicked = false;
                    const onClick = (e: MouseEvent) => {
                        addressClicked = true;
                        goToNextStep();
                        e.preventDefault();
                        e.stopPropagation();
                    };

                    addressButton!.addEventListener('click', onClick, { once: true, capture: true });

                    return async (args) => {
                        if (!args?.ending && !addressClicked && root.$route.path === path) {
                            addressButton!.click();
                            await root.$nextTick();
                        }
                        addressButton!.removeEventListener('click', onClick, true);
                    };
                },
            },
            ui: {
                fadedElements: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .bitcoin-account',
                    '.account-overview .account-balance-container',
                    '.account-overview .mobile-action-bar',
                ],
            },
        } as TourStep

        // Not mobile
        : {
            path,
            tooltip: {
                target: '.address-overview .active-address',
                content: onboardingTexts[OnboardingTourStep.FIRST_ADDRESS].default,
                params: {
                    placement: 'left-start',
                },
            },
            lifecycle: {
                created,
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
                disabledButtons: [
                    '.address-overview .transaction-list a button',
                ],
            },
        } as TourStep;
}
