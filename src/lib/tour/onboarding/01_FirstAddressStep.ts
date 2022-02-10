import { CryptoCurrency } from '@/lib/Constants';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore } from '@/stores/Address';
import { defaultTooltipModifiers } from '..';
import {
    ILifecycleArgs,
    IOnboardingGetStepFnArgs, ITourStep,
    IWalletHTMLElements, OnboardingTourStep,
} from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getFirstAddressStep(
    { isSmallScreen, root, toggleHighlightButton }: IOnboardingGetStepFnArgs): ITourStep {
    const { setActiveCurrency } = useAccountStore();
    const { addressInfos, selectAddress } = useAddressStore();

    const ui: ITourStep['ui'] = {
        fadedElements: [
            IWalletHTMLElements.SIDEBAR_TESTNET,
            IWalletHTMLElements.SIDEBAR_LOGO,
            IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
            IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            IWalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            IWalletHTMLElements.SIDEBAR_NETWORK,
            IWalletHTMLElements.SIDEBAR_SETTINGS,

            IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,

            ...(!isSmallScreen.value
                ? [
                    IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
                ] : [
                    ...Array.from({ length: addressInfos.value.length }).map(
                        (_, i) => `${IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} button:nth-child(${i + 3})`),
                ]
            ),
        ],
        disabledElements: [
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledButtons: [
            IWalletHTMLElements.BUTTON_SIDEBAR_BUY,
            IWalletHTMLElements.BUTTON_SIDEBAR_SELL,
            IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM,
        ],
        scrollLockedElements: [
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} .vue-recycle-scroller`,
        ],
        explicitInteractableElements: [
            `${IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS} .copyable`,
        ],
    };

    const path = '/';

    // User must be able to click the first address to open it in the address overview manually
    const mountedFnForSmallScreen = ({ goToNextStep }: ILifecycleArgs) => {
        const button = `${IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} button:nth-child(2)`;
        toggleHighlightButton(button, true, 'gray');

        const addressButton = document.querySelector(button) as HTMLButtonElement;

        let addressClicked = false;
        const onClick = (e: MouseEvent) => {
            addressClicked = true;
            goToNextStep();
            e.preventDefault();
            e.stopPropagation();
        };

        addressButton!.addEventListener('click', onClick, { once: true, capture: true });

        return async (args: Omit<ILifecycleArgs, 'goToNextStep'>) => {
            if (!args?.ending && !addressClicked && root.$route.path === path) {
                // If user clicked the 'next step' button, then we trigger the click on the first address
                addressButton!.click();
                await root.$nextTick();
            }
            addressButton!.removeEventListener('click', onClick, true);
            setTimeout(() => toggleHighlightButton(button, false, 'gray'), 500);
        };
    };

    const mountedFnForNotSmallScreen = () => {
        // Not show identicon menu when user hover the active address
        const identiconMenu = document.querySelector(
            `${IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS} .identicon-wrapper .identicon-menu`) as HTMLElement;
        identiconMenu.style.display = 'none';
        return () => {
            identiconMenu.style.display = 'flex';
        };
    };

    return {
        path,
        tooltip: {
            get target() {
                return isSmallScreen.value
                    ? `${IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} .address-button .identicon img`
                    : `${IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS} .identicon`;
            },
            get content() {
                return getOnboardingTexts(OnboardingTourStep.FIRST_ADDRESS)[
                    isSmallScreen.value ? 'alternative' : 'default'];
            },
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom-start' : 'left-start';
                },
                get modifiers() {
                    return [
                        {
                            name: 'offset',
                            options: {
                                offset: isSmallScreen.value ? [0, 12] : [0, 20],
                            },
                        },
                        ...defaultTooltipModifiers.filter((d) => d.name !== 'offset'),
                    ];
                },
            },
        },
        lifecycle: {
            created: () => {
                // Select first NIM address as active
                setActiveCurrency(CryptoCurrency.NIM);
                selectAddress(addressInfos.value[0].address);
            },
            mounted: (args) => isSmallScreen.value ? mountedFnForSmallScreen(args) : mountedFnForNotSmallScreen(),
        },
        ui,
    } as ITourStep;
}
