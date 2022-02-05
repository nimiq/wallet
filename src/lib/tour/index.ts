import { useAddressStore } from '@/stores/Address';
import { Transaction } from '@/stores/Transactions';
import { SetupContext } from '@vue/composition-api';
import { getNetworkTourSteps } from './network';
import { getOnboardingTourSteps } from './onboarding';
import { ITooltipModifier, ITourSteps, NetworkTourStep, OnboardingTourStep, TourName } from './types';

export const defaultTooltipModifiers: ITooltipModifier[] = [
    {
        name: 'arrow',
        options: {
            element: '.v-step__arrow',
            padding: 16,
        },
    },
    {
        name: 'preventOverflow',
        options: {
            rootBoundary: 'window',
        },
    },
    {
        name: 'offset',
        options: {
            offset: [0, 10],
        },
    },
];

export function getTour(tour: TourName | undefined, context: SetupContext)
    : ITourSteps<OnboardingTourStep | NetworkTourStep> {
    let steps: ITourSteps<OnboardingTourStep | NetworkTourStep> = {};
    switch (tour) {
        case 'onboarding':
            steps = getOnboardingTourSteps(context);
            break;
        case 'network':
            steps = getNetworkTourSteps(context);
            break;
        default:
    }

    return steps;
}

// Finds the component instance given its name in the Vue tree
export function searchComponentByName(c: Vue, name: string): Vue | undefined {
    if (c.$options.name === name) {
        return c;
    }
    for (const cc of c.$children) {
        const found = searchComponentByName(cc, name);
        if (found) return found;
    }

    return undefined;
}

// TODO Remove me
export function getFakeTx(): Transaction {
    return {
        transactionHash: '0x123',
        format: 'basic',
        timestamp: 1532739000,
        sender: 'NQ02 YP68 BA76 0KR3 QY9C SF0K LP8Q THB6 LTKU',
        recipient: useAddressStore().activeAddress.value || 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
        senderType: 'basic',
        recipientType: 'basic',
        blockHeight: 1,
        blockHash: '0x123456789ABCDEF',
        value: 100_000,
        fee: 1,
        feePerByte: 1,
        validityStartHeight: 1,
        network: 'testnet',
        flags: 0,
        data: {
            raw: 'My awesome data',
        },
        proof: {
            raw: 'ES256K',
        },
        size: 1,
        valid: true,
        state: 'confirmed',
    };
}

export * from './types';
