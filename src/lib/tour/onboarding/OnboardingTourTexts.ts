import { OnboardingTourStep } from '../types';

type TourStepTexts<T extends number> = {
    [x in T]: {
        default: string[], alternative?: string[],
    }
}

export const onboardingTexts: TourStepTexts<OnboardingTourStep> = {
    [OnboardingTourStep.FIRST_ADDRESS]: {
        default: [
            'This is your first address, represented by your avatar.',
            'You can click on the address to copy and share it.',
        ],
    },
    [OnboardingTourStep.TRANSACTIONS_LIST]: {
        default: [
            'This is where all your transactions will appear.',
            'Click the green button to receive a free NIM from Team Nimiq.',
        ],
        alternative: ['This is where all your transactions will appear.'],
    },
    [OnboardingTourStep.FIRST_TRANSACTION]: {
        default: [
            "Here's your first transaction with your first NIM.",
            'Every NIM address comes with an avatar. They help to make sure you got the right one.',
        ],
    },
    [OnboardingTourStep.BITCOIN_ADDRESS]: {
        default: [
            'Check the bar-chart to see how your addresses compose your total balance.',
            'Currently you have 100% NIM, and no BTC.',
        ],
    },
    [OnboardingTourStep.WALLET_BALANCE]: {
        default: [
            'Check the bar-chart to see how your addresses compose your total balance.',
            'Currently you have 100% NIM, and no BTC.',
        ],
    },
    [OnboardingTourStep.BACKUP_ALERT]: {
        default: [
            'There is no \'forgot password\'.',
            'Create a backup to make sure you stay in control.',
        ],
    },
    [OnboardingTourStep.MENU_ICON]: {
        default: [
            'Tap on the menu icon to access your account and wallet settings.',
        ],
    },
    [OnboardingTourStep.ACCOUNT_OPTIONS]: {
        default: [
            'Create, switch and log out of accounts.',
            'All security relevant actions can be found here too.',
        ],
    },
    [OnboardingTourStep.ONBOARDING_COMPLETED]: {
        default: [
            'Wallet tour completed!',
            'Nimiq is not just any crypto - Click on {WORLD} Network and discover true decentralization.',
        ],
    },
};
