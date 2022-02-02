import { SCALING_FACTOR } from '@/lib/NetworkMap';
import { NetworkGetStepFnArgs, NetworkTourStep, TourStep, WalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getYourLocationStep({ nodes, scrollIntoView, sleep, selfNodeIndex }: NetworkGetStepFnArgs): TourStep {
    return {
        path: '/network',
        tooltip: {
            target: `${WalletHTMLElements.NETWORK_NODES} span:nth-child(${selfNodeIndex + 1})`,
            content: getNetworkTexts(NetworkTourStep.YOUR_LOCATION),
            params: {
                // TODO On mobile phones if the node is in the south, the tooltip might break the web
                placement: 'bottom',
            },
        },
        ui: {
            fadedElements: [
                WalletHTMLElements.SIDEBAR_TESTNET,
                WalletHTMLElements.SIDEBAR_LOGO,
                WalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
                WalletHTMLElements.SIDEBAR_PRICE_CHARTS,
                WalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
                WalletHTMLElements.SIDEBAR_NETWORK,
                WalletHTMLElements.SIDEBAR_SETTINGS,
                WalletHTMLElements.NETWORK_STATS,
            ],
            disabledElements: [
                WalletHTMLElements.NETWORK_TABLET_MENU_BAR,
                WalletHTMLElements.NETWORK_MAP,
            ],
            disabledButtons: [WalletHTMLElements.BUTTON_SIDEBAR_BUY, WalletHTMLElements.BUTTON_SIDEBAR_SELL],
        },
        lifecycle: {
            created: (async ({ goingForward }) => {
                scrollIntoView((nodes()[selfNodeIndex].x / 2) * SCALING_FACTOR);
                if (!goingForward) {
                    await sleep(500);
                }
            }),
        },
    } as TourStep;
}
