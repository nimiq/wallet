import { useAccountStore } from '@/stores/Account';
import { GetStepFnArgs, OnboardingTourStep, TourStep, WalletHTMLElements } from '../types';
import { onboardingTexts } from './OnboardingTourTexts';

export function getOnboardingCompletedStep(
    { root, isMediumScreen }: GetStepFnArgs<OnboardingTourStep>): TourStep {
    const ui: TourStep['ui'] = {
        fadedElements: [
            WalletHTMLElements.SIDEBAR_TESTNET,
            WalletHTMLElements.SIDEBAR_LOGO,
            WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            WalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            WalletHTMLElements.SIDEBAR_SETTINGS,
            WalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            WalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            WalletHTMLElements.SIDEBAR_NETWORK,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            WalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            WalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            WalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            WalletHTMLElements.ADDRESS_OVERVIEW,
        ],
        disabledButtons: [
            WalletHTMLElements.BUTTON_SIDEBAR_BUY,
            WalletHTMLElements.BUTTON_SIDEBAR_SELL,
            WalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
    };
    return {
        path: isMediumScreen.value ? '/?sidebar=true' : '/',
        tooltip: {
            target: `${WalletHTMLElements.SIDEBAR_NETWORK} ${isMediumScreen.value ? '.consensus-icon' : 'span'}`,
            content: onboardingTexts[OnboardingTourStep.ONBOARDING_COMPLETED].default,
            params: {
                placement: isMediumScreen.value ? 'top-start' : 'right',
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
        ui,
    } as TourStep;
}
