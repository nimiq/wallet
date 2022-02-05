import { ref } from '@vue/composition-api';
import { defaultTooltipModifiers, INetworkGetStepFnArgs, ITourStep, IWalletHTMLElements, NetworkTourStep } from '..';
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
                get placement() {
                    const { position } = nodes()[selectedNode.value] || { position: undefined };
                    if (!position) return 'bottom';
                    if (isLargeScreen.value) {
                        // If node is far away in the eastern hemisphere, the tooltip will be on the left
                        return position.x > 100 ? 'left' : 'right';
                    }
                    // If node is far away in the south hemisphere, the tooltip will be on the top
                    return position.y > 25 ? 'top' : 'bottom';
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
            disabledButtons: [
                IWalletHTMLElements.BUTTON_SIDEBAR_BUY,
                IWalletHTMLElements.BUTTON_SIDEBAR_SELL,
            ],
            scrollLockedElements: [
                IWalletHTMLElements.NETWORK_SCROLLER,
            ],
        },
        lifecycle: {
            created: (async () => {
                const distance = ([x1, y1]: number[], [x2, y2]: number[]) => (((x1 - x2) ** 2) + (y1 - y2) ** 2) ** 0.5;
                const _nodes = nodes();
                const { position: pSelf } = _nodes[selfNodeIndex];

                // get closest west node minimum distance of 5
                const node = _nodes
                    // add index
                    .map((n, i) => ({ ...n, i, x: n.x }))
                    // remove self
                    .filter((_, i) => i !== selfNodeIndex)
                    // compute distance
                    .map((n) => ({ ...n, d: distance([n.position.x, n.position.y], [pSelf.x, pSelf.y]) }))
                    // at least 5 distance away
                    .filter(({ d }) => d > 5)
                    // get closest
                    .sort((a, b) => a.d - b.d)[0];

                // get the index so we can select the correct child in the dom to show the tooltip
                selectedNode.value = node.i;

                scrollIntoView(node.x);

                await sleep(500);
            }),
        },
    } as ITourStep;
}
