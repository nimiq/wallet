import { NetworkGetStepFnArgs, NetworkTourStep, TourStep, WalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getNetworkCompletedStep({ isLargeScreen }: NetworkGetStepFnArgs): TourStep {
    return {
        path: '/network',
        tooltip: {
            get target() {
                return isLargeScreen.value
                    ? WalletHTMLElements.SIDEBAR_ACCOUNT_MENU
                    : `${WalletHTMLElements.NETWORK_TABLET_MENU_BAR} .account-button`;
            },
            content: getNetworkTexts(NetworkTourStep.NETWORK_COMPLETED, isLargeScreen.value),
            params: {
                get placement() {
                    return isLargeScreen.value ? 'right' : 'top';
                },
            },
            button: {
                text: 'End Tour',
                fn: async (endTour) => {
                    if (endTour) {
                        await endTour();
                    }
                },
            },
        },
        ui: {
            fadedElements: [
                WalletHTMLElements.SIDEBAR_TESTNET,
                WalletHTMLElements.SIDEBAR_LOGO,
                WalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
                WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
                WalletHTMLElements.SIDEBAR_NETWORK,
                WalletHTMLElements.SIDEBAR_SETTINGS,
            ],
            disabledElements: [
                WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
                WalletHTMLElements.NETWORK_TABLET_MENU_BAR,
                WalletHTMLElements.NETWORK_MAP,
                WalletHTMLElements.NETWORK_STATS,
            ],
            disabledButtons: [WalletHTMLElements.BUTTON_SIDEBAR_BUY, WalletHTMLElements.BUTTON_SIDEBAR_SELL],
        },
    } as TourStep;
}
