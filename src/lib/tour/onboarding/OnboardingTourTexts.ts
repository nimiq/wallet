import { ITourStepTexts, OnboardingTourStep } from '../types';

// This is used to trick the translation extraction script into extracting those strings
const $t = (s: string) => s;

const texts: ITourStepTexts<OnboardingTourStep> = {
    [OnboardingTourStep.FIRST_ADDRESS]: {
        default: [
            $t('This is your first address, represented by your avatar.'),
            $t('You can click on the address to copy and share it.'),
        ],
        alternative: [
            $t('This is your first address, represented by your avatar.'),
            $t('Tap it to open the address details.'),
        ],
    },
    [OnboardingTourStep.TRANSACTION_LIST]: {
        default: [
            $t('This is where all your transactions will appear.'),
            $t('Click the green button to receive a free NIM from Team Nimiq.'),
        ],
        alternative: ['This is where all your transactions will appear.'],
    },
    [OnboardingTourStep.FIRST_TRANSACTION]: {
        default: [
            $t('Here’s your first transaction with your first NIM.'),
            $t('Every NIM address comes with an avatar. They help to make sure you got the right one.'),
        ],
        alternative: [
            $t('Here are your transactions.'),
            $t('Every NIM address comes with an avatar. They help to make sure you got the right one.'),
        ],
    },
    [OnboardingTourStep.BITCOIN_ADDRESS]: {
        default: [
            $t('This is your Bitcoin wallet. You get one with every Nimiq account.'),
        ],
    },
    [OnboardingTourStep.WALLET_BALANCE]: {
        default: [
            $t('Check the bar-chart to see how your addresses compose your total balance.'),
            $t('Currently you have 100% NIM, and no BTC.'),
        ],
        alternative: [
            // TODO Implement this
            $t('Check the bar-chart to see how your addresses compose your total balance.'),
        ],
    },
    [OnboardingTourStep.BACKUP_ALERT]: {
        default: [
            $t('There is no ‘forgot password’. Create a backup to make sure you stay in control.'),
        ],
        alternative: [
            $t('Seriously! There is no ‘forgot password’! Create a backup to make sure you stay in control.'),
        ],
    },
    [OnboardingTourStep.MENU_ICON]: {
        default: [
            $t('Tap on the menu icon to access your account and wallet settings.'),
        ],
    },

    // TODO Review these
    [OnboardingTourStep.BACKUP_OPTION_LARGE_SCREENS]: {
        default: [
            $t('You can always create a new backup. Simply click your account and select ‘Create backup’.'),
        ],
    },
    [OnboardingTourStep.ACCOUNT_OPTIONS]: {
        default: [
            $t('Create, switch and log out of accounts.'),
            $t('All security relevant actions can be found here too.'),
        ],
    },
    [OnboardingTourStep.BACKUP_OPTION_NOT_LARGE_SCREENS]: {
        default: [
            $t('You can always create a new backup.'),
            $t('Simply click your account and select ‘Create backup’.'),
        ],
    },
    [OnboardingTourStep.ONBOARDING_COMPLETED]: {
        default: [
            $t('Wallet tour completed!'),
            $t('Nimiq is not just any crypto - Click on {network_icon} Network '
            + 'and discover true decentralization.'),
        ],
    },
};

export function getOnboardingTexts(i: OnboardingTourStep) {
    return texts[i];
}
