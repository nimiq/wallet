import { i18n } from '@/i18n/i18n-setup';
import { IContentSpecialItem, NetworkTourStep, ITourStepTexts } from '../types';

const t = (input: string) => i18n.tc(input) as string;

const texts: ITourStepTexts<NetworkTourStep> = {
    [NetworkTourStep.YOUR_LOCATION]: {
        default: [
            t('This is you. Your location is determined by your IP address.'),
            t('Nimiq doesn’t collect or store such data.'),
        ],
    },
    [NetworkTourStep.BACKBONE_NODE]: {
        default: [
            t('This is a peer or a backbone node that you are connected to.'),
            t('These connections enable you to establish consensus with a sub set of participants directly.'),
            [
                t('‘Available browsers’ are other user’s browsers, just like yours.'),
                t('‘Backbone nodes’ provide a fallback to connect to.'),
            ],
        ],
    },
    [NetworkTourStep.METRICS]: {
        default: [
            t('Find the network’s key performance metrics below.'),
            t(`The ${IContentSpecialItem.ICON_ACCOUNT}-icon indicates that you are connected to the network.`),
        ],
    },
    [NetworkTourStep.NETWORK_COMPLETED]: {
        default: [
            t('You made it!'),
            IContentSpecialItem.HR,
            t('Enjoy the decentralized future, and don’t forget to invite your friends and family.'),
            t(`Click ${IContentSpecialItem.ICON_ACCOUNT} to get back to your wallet.`),
        ],
        alternative: [
            t('You made it!'),
            IContentSpecialItem.HR,
            t('Enjoy the decentralized future, and don’t forget to invite your friends and family.'),
            t('Click <b>‘Back to Addresses’</b> to get back to your wallet.'),
        ],
    },
};

export function getNetworkTexts(i: NetworkTourStep) {
    return texts[i];
}
