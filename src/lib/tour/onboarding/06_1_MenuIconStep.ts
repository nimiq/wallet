import { defaultTooltipModifiers, IWalletHTMLElements } from '..';
import { ITourStep, OnboardingTourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getMenuIconStep(): ITourStep {
    return {
        path: '/',
        tooltip: {
            target: `${IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR} > button.reset`,
            content: getOnboardingTexts(OnboardingTourStep.MENU_ICON).default,
            params: {
                placement: 'bottom-start',
                modifiers: [
                    {
                        name: 'preventOverflow',
                        options: {
                            mainAxis: false,
                            padding: 8,
                        },
                    },
                    {
                        name: 'offset',
                        options: {
                            offset: [-20, 10],
                        },
                    },
                    ...defaultTooltipModifiers.filter(({ name }) => ['offset', 'preventOverflow'].includes(name)),
                ],
            },
        },
        lifecycle: {
            mounted: async ({ goToNextStep }) => {
                // User is expected to click the hamburguer icon to go to next step
                const hamburguerIcon = document.querySelector(
                    `${IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR} > button.reset`) as HTMLButtonElement;

                const onHamburguerClick = () => goToNextStep();
                hamburguerIcon!.addEventListener('click', onHamburguerClick, true);

                return () => {
                    hamburguerIcon!.removeEventListener('click', onHamburguerClick, true);
                };
            },
        },
        ui: {
            fadedElements: [
                IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            ],
            disabledElements: [
                IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
                IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
                IWalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
                IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
                IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
                IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
                IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
                IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
            ],
            disabledButtons: [
                IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
            ],
            scrollLockedElements: [
                IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
                `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} .vue-recycle-scroller`,
            ],
            isNextStepDisabled: true,
        },
    } as ITourStep;
}
