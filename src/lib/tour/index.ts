import { useAddressStore } from '@/stores/Address';
import { SetupContext } from '@vue/composition-api';
import { Transaction } from '@/stores/Transactions';
import { getNetworkTourSteps } from './network';
import { getOnboardingTourSteps } from './onboarding';
import { NetworkTourStep, OnboardingTourStep, TourName, TourSteps } from './types';

export function getTour(tour: TourName | null, context: SetupContext)
    : TourSteps<OnboardingTourStep> | TourSteps<NetworkTourStep> | undefined {
    switch (tour) {
        case 'onboarding':
            return getOnboardingTourSteps(context);
        case 'network':
            return getNetworkTourSteps();
        default:
            return undefined;
    }
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
