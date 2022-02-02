import { OnboardingTourStep } from '../types';

type TourStepTexts<T extends number> = {
    [x in T]: {
        default: string[], alternative?: string[],
    }
}

export function getOnboardingTexts(i: OnboardingTourStep) {
    return ({
        [OnboardingTourStep.FIRST_ADDRESS]: {
            default: [
                'This is your first address, represented by your avatar.',
                'You can click on the address to copy and share it.',
            ],
        },
        [OnboardingTourStep.TRANSACTION_LIST]: {
            default: [
                'This is where all your transactions will appear.',
                'Click the green button to receive a free NIM from Team Nimiq.',
            ],
            alternative: ['This is where all your transactions will appear.'],
        },
        [OnboardingTourStep.FIRST_TRANSACTION]: {
            default: [
                'Here’s your first transaction with your first NIM.',
                'Every NIM address comes with an avatar. They help to make sure you got the right one.',
            ],
            alternative: [
                'Here are your transactions.',
                'Every NIM address comes with an avatar. They help to make sure you got the right one.',
            ],
        },
        [OnboardingTourStep.BITCOIN_ADDRESS]: {
            default: [
                'This is your Bitcoin wallet. You get one with every Nimiq account.',
            ],
        },
        [OnboardingTourStep.WALLET_BALANCE]: {
            default: [
                'Check the bar-chart to see how your addresses compose your total balance.',
                'Currently you have 100% NIM, and no BTC.',
            ],
            alternative: [
                // TODO Implement this
                'Check the bar-chart to see how your addresses compose your total balance.',
            ],
        },
        [OnboardingTourStep.BACKUP_ALERT]: {
            default: [
                'There is no ‘forgot password’. Create a backup to make sure you stay in control.',
            ],
            alternative: [
                'Seriously! There is no ‘forgot password’! Create a backup to make sure you stay in control.',
            ],
        },
        [OnboardingTourStep.MENU_ICON]: {
            default: [
                'Tap on the menu icon to access your account and wallet settings.',
            ],
        },

        // TODO Review these
        [OnboardingTourStep.BACKUP_OPTION_LARGE_SCREENS]: {
            default: [
                'You can always create a new backup. Simply click your account and select ‘Create backup’.',
            ],
        },
        [OnboardingTourStep.ACCOUNT_OPTIONS]: {
            default: [
                'Create, switch and log out of accounts.',
                'All security relevant actions can be found here too.',
            ],
        },
        [OnboardingTourStep.BACKUP_OPTION_NOT_LARGE_SCREENS]: {
            default: [
                'You can always create a new backup.',
                'Simply click your account and select ‘Create backup’.',
            ],
        },
        [OnboardingTourStep.ONBOARDING_COMPLETED]: {
            default: [
                'Wallet tour completed!',
                'Nimiq is not just any crypto - Click on {WORLD} Network and discover true decentralization.',
            ],
        },
    } as TourStepTexts<OnboardingTourStep>)[i];
}
