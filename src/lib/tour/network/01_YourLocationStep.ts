import { SCALING_FACTOR } from '@/lib/NetworkMap';
import { INetworkGetStepFnArgs, NetworkTourStep, ITourStep, IWalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getYourLocationStep({ nodes, scrollIntoView, sleep, selfNodeIndex }: INetworkGetStepFnArgs): ITourStep {
    return {
        path: '/network',
        tooltip: {
            target: `${IWalletHTMLElements.NETWORK_NODES} span:nth-child(${selfNodeIndex + 1})`,
            content: getNetworkTexts(NetworkTourStep.YOUR_LOCATION).default,
            params: {
                // TODO On mobile phones if the node is in the south, the tooltip might break the web
                placement: 'bottom',
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
                IWalletHTMLElements.NETWORK_STATS,
            ],
            disabledElements: [
                IWalletHTMLElements.NETWORK_TABLET_MENU_BAR,
                IWalletHTMLElements.NETWORK_MAP,
            ],
            disabledButtons: [IWalletHTMLElements.BUTTON_SIDEBAR_BUY, IWalletHTMLElements.BUTTON_SIDEBAR_SELL],
        },
        lifecycle: {
            created: (async ({ goingForward }) => {
                scrollIntoView((nodes()[selfNodeIndex].x / 2) * SCALING_FACTOR);
                if (!goingForward) {
                    await sleep(500);
                }
            }),
        },
    } as ITourStep;
}
