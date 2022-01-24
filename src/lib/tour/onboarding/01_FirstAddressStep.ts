import { CryptoCurrency } from '@/lib/Constants';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { GetStepFnArgs, OnboardingTourStep, TourStep } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getFirstAddressStep({ isMobile, root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const firstAddressLifecycle: TourStep['lifecycle'] = {
        created: () => {
            const { setActiveCurrency } = useAccountStore();
            const { addressInfos, selectAddress } = useAddressStore();
            setActiveCurrency(CryptoCurrency.NIM);
            selectAddress(addressInfos.value[0].address);
        },
    };

    const firstAddressMobile: TourStep = {
        path: '/',
        tooltip: {
            target: '.address-list > .address-button .identicon img',
            content: onboardingTexts[OnboardingTourStep.FIRST_ADDRESS].default,
            params: {
                placement: 'bottom-start',
            },
        },
        lifecycle: {
            ...firstAddressLifecycle,
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
                    if (!args?.ending && !addressClicked && root.$route.path === firstAddressMobile.path) {
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
    };

    return firstAddressMobile;
}
