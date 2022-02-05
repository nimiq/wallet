import { defaultTooltipModifiers, INetworkGetStepFnArgs, ITourStep, IWalletHTMLElements, NetworkTourStep } from '..';
import { getNetworkTexts } from './NetworkTourTexts';

export function getYourLocationStep(
    { isLargeScreen, nodes, scrollIntoView, sleep, selfNodeIndex }: INetworkGetStepFnArgs): ITourStep {
    return {
        path: '/network',
        tooltip: {
            target: `${IWalletHTMLElements.NETWORK_NODES} span:nth-child(${selfNodeIndex + 1})`,
            content: getNetworkTexts(NetworkTourStep.YOUR_LOCATION).default,
            params: {
                get placement() {
                    const { position } = nodes()[selfNodeIndex] || { position: undefined };
                    if (!position) return 'bottom';
                    if (isLargeScreen.value) {
                        // If node is far away in the eastern hemisphere, the tooltip will be on the left
                        return position.x > 80 ? 'left' : 'right';
                    }
                    // If node is far away in the south hemisphere, the tooltip will be on the top
                    return position.y > 25 ? 'top' : 'bottom';
                },
                get modifiers() {
                    return [
                        {
                            name: 'offset',
                            options: {
                                offset: isLargeScreen.value ? [0, 12] : [0, 16],
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
            disabledButtons: [IWalletHTMLElements.BUTTON_SIDEBAR_BUY, IWalletHTMLElements.BUTTON_SIDEBAR_SELL],
            scrollLockedElements: [
                IWalletHTMLElements.NETWORK_SCROLLER,
            ],
        },
        lifecycle: {
            created: (async ({ goingForward }) => {
                scrollIntoView(nodes()[selfNodeIndex].x);
                if (!goingForward) {
                    await sleep(500);
                }
            }),
        },
    } as ITourStep;
}
