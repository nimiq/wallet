import { NetworkTourStep } from '../types';

type TourStepTexts<T extends number> = {
    [x in T]: string[]
}

export function getNetworkTexts(i: NetworkTourStep, isLargeScreen?: boolean) {
    return ({
        [NetworkTourStep.YOUR_LOCATION]: [
            'This is you. Your location is determined by your IP address.',
            'Nimiq doesn’t collect or store such data.',
        ],
        [NetworkTourStep.BACKBONE_NODE]: [
            'This is a peer or a backbone node that you are connected to.',
            'These connections enable you to establish consensus with a sub set of participants directly.',
            [
                '‘Available browsers’ are other user’s browsers, just like yours.',
                '‘Backbone nodes’ provide a fallback to connect to.',
            ],
        ],
        [NetworkTourStep.METRICS]: [
            'Find the network’s key performance metrics below.',
            'The {{NETWORK}}-icon indicates that you are connected to the network.',
        ],
        [NetworkTourStep.NETWORK_COMPLETED]: [
            'You made it!',
            'HR',
            'Enjoy the decentralized future, and don’t forget to invite your friends and family.',
            isLargeScreen
                ? 'Click {{ ACCOUNT }} to get back to your wallet.'
                : 'Click <b>‘Back to Addresses’</b> to get back to your wallet.',
        ],
    } as TourStepTexts<NetworkTourStep>)[i];
}
