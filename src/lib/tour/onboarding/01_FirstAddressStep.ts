import { CryptoCurrency } from '@/lib/Constants';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { GetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getFirstAddressStep(
    { isSmallScreen, isANewUser, root }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const created = () => {
        const { setActiveCurrency } = useAccountStore();
        const { addressInfos, selectAddress } = useAddressStore();
        setActiveCurrency(CryptoCurrency.NIM);
        selectAddress(addressInfos.value[0].address);
    };
    const path = '/';

    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            WalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            WalletHTMLElements.SIDEBAR_NETWORK,
            WalletHTMLElements.SIDEBAR_SETTINGS,

            WalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,

            !isSmallScreen.value ? WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST : '',
        ],
        disabledElements: [
            WalletHTMLElements.ADDRESS_OVERVIEW,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM,
        ],
    };

    if (isSmallScreen.value) {
        return {
            path,
            tooltip: {
                target: `${WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} .address-button .identicon img`,
                content: getOnboardingTexts(OnboardingTourStep.FIRST_ADDRESS, isANewUser).default,
                params: {
                    placement: 'bottom-start',
                },
            },
            lifecycle: {
                created,
                mounted: ({ goToNextStep }) => {
                    if (!isSmallScreen.value) {
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
            ui,
        } as TourStep;
    }

    // Not mobile
    return {
        path,
        tooltip: {
            target: `${WalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS} .identicon`,
            content: getOnboardingTexts(OnboardingTourStep.FIRST_ADDRESS, isANewUser).default,
            params: {
                placement: 'left-start',
            },
        },
        lifecycle: {
            created,
        },
        ui,
    } as TourStep;
}
