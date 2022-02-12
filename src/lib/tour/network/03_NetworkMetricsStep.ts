import { NetworkTourStep, ITourStep, IWalletHTMLElements, defaultTooltipModifiers } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getNetworkMetricsStep(): ITourStep {
    return {
        path: '/network',
        tooltip: {
            target: IWalletHTMLElements.NETWORK_STATS,
            content: getNetworkTexts(NetworkTourStep.METRICS).default,
            params: {
                placement: 'top',
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
        },
        ui: {
            fadedElements: [
                IWalletHTMLElements.SIDEBAR_TESTNET,
                IWalletHTMLElements.SIDEBAR_LOGO,
                IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
                IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
                IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
                IWalletHTMLElements.SIDEBAR_NETWORK,
                IWalletHTMLElements.SIDEBAR_SETTINGS,
            ],
            disabledElements: [
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
