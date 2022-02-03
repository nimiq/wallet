import { SCALING_FACTOR } from '@/lib/NetworkMap';
import { ref } from '@vue/composition-api';
import { INetworkGetStepFnArgs, NetworkTourStep, ITourStep, IWalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getBackboneNodeStep(
    { nodes, selfNodeIndex, isLargeScreen, scrollIntoView, sleep }: INetworkGetStepFnArgs): ITourStep {
    const selectedNode = ref(-1);
    return {
        path: '/network',
        tooltip: {
            get target() {
                return `${IWalletHTMLElements.NETWORK_NODES} span:nth-child(${selectedNode.value + 1})`;
            },
            content: getNetworkTexts(NetworkTourStep.BACKBONE_NODE).default,
            params: {
                // TODO On mobile phones if the node is in the south, the tooltip might break the web
                placement: isLargeScreen.value ? 'right' : 'bottom',
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
            created: (async () => {
                const distance = ([x1, y1]: number[], [x2, y2]: number[]) => (((x1 - x2) ** 2) + (y1 - y2) ** 2) ** 0.5;
                const _nodes = nodes();
                const { position: pSelf } = _nodes[selfNodeIndex];

                // get closest west node minimum distance of 5
                const node = _nodes
                    .map((n, i) => ({ ...n, i, x: n.x })) // add index
                    .filter((_, i) => i !== selfNodeIndex)
                    .map((n) => ({ ...n, d: distance([n.position.x, n.position.y], [pSelf.x, pSelf.y]) }))
                    .filter(({ d }) => d > 5)
                    .sort((a, b) => a.d - b.d)[0];
                selectedNode.value = node.i;
                scrollIntoView((node.x / 2) * SCALING_FACTOR);
                await sleep(500);
            }),
        },
    } as ITourStep;
}
