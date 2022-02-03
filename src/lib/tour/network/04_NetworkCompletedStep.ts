import { INetworkGetStepFnArgs, NetworkTourStep, ITourStep, IWalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getNetworkCompletedStep({ isLargeScreen }: INetworkGetStepFnArgs): ITourStep {
    return {
        path: '/network',
        tooltip: {
            get target() {
                return isLargeScreen.value
                    ? IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU
                    : `${IWalletHTMLElements.NETWORK_TABLET_MENU_BAR} .account-button`;
            },
            content: getNetworkTexts(NetworkTourStep.NETWORK_COMPLETED)[
                isLargeScreen.value ? 'alternative' : 'default'],
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
                IWalletHTMLElements.SIDEBAR_TESTNET,
                IWalletHTMLElements.SIDEBAR_LOGO,
                IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
                IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
                IWalletHTMLElements.SIDEBAR_NETWORK,
                IWalletHTMLElements.SIDEBAR_SETTINGS,
            ],
            disabledElements: [
                IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
                IWalletHTMLElements.NETWORK_TABLET_MENU_BAR,
                IWalletHTMLElements.NETWORK_MAP,
                IWalletHTMLElements.NETWORK_STATS,
            ],
            disabledButtons: [IWalletHTMLElements.BUTTON_SIDEBAR_BUY, IWalletHTMLElements.BUTTON_SIDEBAR_SELL],
        },
    } as ITourStep;
}
