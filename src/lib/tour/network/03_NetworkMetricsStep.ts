import { NetworkTourStep, TourStep, WalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getNetworkMetricsStep(): TourStep {
    return {
        path: '/network',
        tooltip: {
            target: WalletHTMLElements.NETWORK_STATS,
            content: getNetworkTexts(NetworkTourStep.METRICS),
            params: {
                placement: 'top',
            },
        },
        ui: {
            fadedElements: [
                WalletHTMLElements.SIDEBAR_TESTNET,
                WalletHTMLElements.SIDEBAR_LOGO,
                WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
                WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
                WalletHTMLElements.SIDEBAR_NETWORK,
                WalletHTMLElements.SIDEBAR_SETTINGS,
            ],
            disabledElements: [
                WalletHTMLElements.NETWORK_TABLET_MENU_BAR,
                WalletHTMLElements.NETWORK_MAP,
                WalletHTMLElements.NETWORK_STATS,
            ],
            disabledButtons: [WalletHTMLElements.BUTTON_SIDEBAR_BUY, WalletHTMLElements.BUTTON_SIDEBAR_SELL],
        },
    } as TourStep;
}
