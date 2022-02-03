import { useWindowSize } from '@/composables/useWindowSize';
import { NodeHexagon, NodeType, WIDTH } from '@/lib/NetworkMap';
import { SetupContext } from '@vue/composition-api';
import { searchComponentByName } from '..';
import { INetworkGetStepFnArgs, NetworkTourStep, ITourSteps, IWalletHTMLElements } from '../types';
import { getYourLocationStep } from './01_YourLocationStep';
import { getBackboneNodeStep } from './02_BackboneNodeStep';
import { getNetworkMetricsStep } from './03_NetworkMetricsStep';
import { getNetworkCompletedStep } from './04_NetworkCompletedStep';

export function getNetworkTourSteps({ root }: SetupContext): ITourSteps<NetworkTourStep> {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const { isSmallScreen, isMediumScreen, isLargeScreen } = useWindowSize();

    const networkMapInstance = searchComponentByName(root, 'network-map') as any;
    const nodes = () => networkMapInstance?.nodes as NodeHexagon[] || [];
    const selfNodeIndex = nodes().findIndex((node) => [...node.peers].find((p) => p.type === NodeType.SELF));

    const scrollIntoView = async (x: number) => {
        const map = document.querySelector(IWalletHTMLElements.NETWORK_SCROLLER) as HTMLElement;
        const mapWidth = map.children[0]!.clientWidth;
        const adjustedX = x * (mapWidth / WIDTH);
        const scrollTarget = adjustedX - (window.innerWidth / 2);
        map.scrollTo(scrollTarget, 0);
    };

    const args: INetworkGetStepFnArgs = {
        nodes,
        selfNodeIndex,
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
        scrollIntoView,
        sleep,
    };

    return {
        [NetworkTourStep.YOUR_LOCATION]: getYourLocationStep(args),
        [NetworkTourStep.BACKBONE_NODE]: getBackboneNodeStep(args),
        [NetworkTourStep.METRICS]: getNetworkMetricsStep(),
        [NetworkTourStep.NETWORK_COMPLETED]: getNetworkCompletedStep(args),
    };
}
