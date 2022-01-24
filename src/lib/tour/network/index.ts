import { NetworkTourStep, TourSteps } from '../types';

export function getNetworkTourSteps(): TourSteps<NetworkTourStep> {
    return {
        [NetworkTourStep.TODO]: {
            path: '/network',
            tooltip: {
                target: '.network-overview .network-name',
                content: [
                    'Welcome to the {WORLD} Network!',
                    'This is the main network where all Nimiq transactions take place.',
                    'You can switch between networks by clicking on the {WORLD} Network icon in the top right corner.',
                ],
                params: {
                    placement: 'bottom',
                },
            },
            ui: {},
        },
    };
}
