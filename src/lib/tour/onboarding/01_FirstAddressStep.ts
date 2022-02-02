import { CryptoCurrency } from '@/lib/Constants';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { OnboardingGetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getFirstAddressStep(
    { isSmallScreen, root, toggleHighlightButton }: OnboardingGetStepFnArgs): TourStep {
    const { setActiveCurrency } = useAccountStore();
    const { addressInfos, selectAddress } = useAddressStore();

    const created = () => {
        setActiveCurrency(CryptoCurrency.NIM);
        selectAddress(addressInfos.value[0].address);
    };
    const path = '/';

    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
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

            ...(!isSmallScreen.value
                ? [
                    WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
                ] : [
                    ...Array.from({ length: addressInfos.value.length }).map(
                        (_, i) => `${WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} button:nth-child(${i + 3})`),
                ]
            ),
        ],
        disabledElements: [
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            WalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
            WalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM,
        ],
        scrollLockedElements: [WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST],
    };

    return {
        path,
        tooltip: {
            get target() {
                return isSmallScreen.value
                    ? `${WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} .address-button .identicon img`
                    : `${WalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS} .identicon`;
            },
            content: getOnboardingTexts(OnboardingTourStep.FIRST_ADDRESS).default,
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom-start' : 'left-start';
                },
            },
        },
        lifecycle: {
            created,
            mounted: ({ goToNextStep }) => {
                if (!isSmallScreen.value) {
                    return undefined;
                }

                const button = `${WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} button:nth-child(2)`;
                toggleHighlightButton(button, true, 'gray');

                // Listener for the first address button only for mobile

                const addressButton = document.querySelector(button) as HTMLButtonElement;

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
                    setTimeout(() => toggleHighlightButton(button, false, 'gray'), 500);
                };
            },
        },
        ui,
    } as TourStep;
}
