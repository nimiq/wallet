import { SCALING_FACTOR } from '@/lib/NetworkMap';
import { ref } from '@vue/composition-api';
import { NetworkGetStepFnArgs, NetworkTourStep, TourStep, WalletHTMLElements } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getBackboneNodeStep(
    { nodes, selfNodeIndex, isLargeScreen, scrollIntoView, sleep }: NetworkGetStepFnArgs): TourStep {
    const selectedNode = ref(-1);
    return {
        path: '/network',
        tooltip: {
            get target() {
                return `${WalletHTMLElements.NETWORK_NODES} span:nth-child(${selectedNode.value + 1})`;
            },
            content: getNetworkTexts(NetworkTourStep.BACKBONE_NODE),
            params: {
                // TODO On mobile phones if the node is in the south, the tooltip might break the web
                placement: isLargeScreen.value ? 'right' : 'bottom',
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
    } as TourStep;
}
