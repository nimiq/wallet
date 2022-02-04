import { IContentSpecialItem, ITourStepTexts, NetworkTourStep } from '../types';

// TODO Add translations
// const $t = (input: string) => i18n.tc(input) as string;

const texts: ITourStepTexts<NetworkTourStep> = {
    [NetworkTourStep.YOUR_LOCATION]: {
        default: [
            'This is you. Your location is determined by your IP address.',
            'Nimiq doesn’t collect or store such data.',
        ],
    },
    [NetworkTourStep.BACKBONE_NODE]: {
        default: [
            'This is a peer or a backbone node that you are connected to.',
            'These connections enable you to establish consensus with a sub set of participants directly.',
            [
                '‘Available browsers’ are other user’s browsers, just like yours.',
                '‘Backbone nodes’ provide a fallback to connect to.',
            ],
        ],
    },
    [NetworkTourStep.METRICS]: {
        default: [
            'Find the network’s key performance metrics below.',
            `The ${IContentSpecialItem.ICON_NETWORK_WORLD}-icon indicates that you are connected to the network.`,
        ],
    },
    [NetworkTourStep.NETWORK_COMPLETED]: {
        default: [
            'You made it!',
            IContentSpecialItem.HR,
            'Enjoy the decentralized future, and don’t forget to invite your friends and family.',
            `Click ${IContentSpecialItem.ICON_ACCOUNT} to get back to your wallet.`,
        ],
        alternative: [
            'You made it!',
            IContentSpecialItem.HR,
            'Enjoy the decentralized future, and don’t forget to invite your friends and family.',
            'Click <b>‘Back to Addresses’</b> to get back to your wallet.',
        ],
    },
};

export function getNetworkTexts(i: NetworkTourStep) {
    return texts[i];
}
