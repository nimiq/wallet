import { INetworkGetStepFnArgs, NetworkTourStep, ITourStep, IWalletHTMLElements, defaultTooltipModifiers } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getNetworkCompletedStep({ root, isLargeScreen }: INetworkGetStepFnArgs): ITourStep {
    return {
        path: '/network',
        tooltip: {
            get target() {
                return isLargeScreen.value
                    ? IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU
                    : `${IWalletHTMLElements.NETWORK_TABLET_MENU_BAR} .account-button`;
            },
            content: getNetworkTexts(NetworkTourStep.NETWORK_COMPLETED)[
                isLargeScreen.value ? 'default' : 'alternative'],
            params: {
                get placement() {
                    return isLargeScreen.value ? 'right' : 'top';
                },
                get modifiers() {
                    return [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 16],
                            },
                        },
                        ...defaultTooltipModifiers.filter((d) => d.name !== 'offset'),
                    ];
                },
            },
            button: {
                text: root.$t('End Tour'),
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
            disabledButtons: [
                IWalletHTMLElements.BUTTON_SIDEBAR_BUY,
                IWalletHTMLElements.BUTTON_SIDEBAR_SELL,
            ],
            scrollLockedElements: [
                IWalletHTMLElements.NETWORK_SCROLLER,
            ],
        },
    } as ITourStep;
}
