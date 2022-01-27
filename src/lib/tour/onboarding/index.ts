import { useWindowSize } from '@/composables/useWindowSize';
import { SetupContext } from '@vue/composition-api';
import { GetStepFnArgs, OnboardingTourStep, TourSteps } from '../types';
import { getFirstAddressStep } from './01_FirstAddressStep';
import { getTransactionListStep } from './02_TransactionListStep';
import { getFirstTransactionStep } from './03_FirstTransactionStep';
import { getBitcoinAddressStep } from './04_BitcoinAddressStep';
import { getWalletBalanceStep } from './05_WalletBalanceStep';
import { getBackupAlertStep } from './06_0_BackupAlertStep';
import { getMenuIconStep } from './06_1_MenuIconStep';
import { getAccountOptionsStep } from './07_AccountOptionsStep';
import { getOnboardingCompletedStep } from './08_OnboardingCompleted';

export function getOnboardingTourSteps({ root }: SetupContext): TourSteps<OnboardingTourStep> {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const toggleDisabledAttribute = async (selector: string, disabled: boolean) => {
        const el = document.querySelector(selector) as HTMLButtonElement;
        if (el) {
            el.disabled = disabled;
            await root.$nextTick();
        }
    };

    const { isSmallScreen, isMediumScreen, isLargeScreen } = useWindowSize();

    // Declaring steps here so we can reference it in the lifecycle functions
    const steps: TourSteps<OnboardingTourStep> = {};

    const args: GetStepFnArgs<OnboardingTourStep> = {
        sleep,
        steps,
        toggleDisabledAttribute,
        root,
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
    };

    steps[OnboardingTourStep.FIRST_ADDRESS] = getFirstAddressStep(args);
    steps[OnboardingTourStep.TRANSACTIONS_LIST] = getTransactionListStep(args);
    steps[OnboardingTourStep.FIRST_TRANSACTION] = getFirstTransactionStep(args);
    steps[OnboardingTourStep.BITCOIN_ADDRESS] = getBitcoinAddressStep(args);
    steps[OnboardingTourStep.WALLET_BALANCE] = getWalletBalanceStep(args);
    steps[OnboardingTourStep.BACKUP_ALERT] = getBackupAlertStep(args);
    if (!isLargeScreen.value) {
        steps[OnboardingTourStep.MENU_ICON] = getMenuIconStep();
    }
    steps[OnboardingTourStep.ACCOUNT_OPTIONS] = getAccountOptionsStep(args);
    steps[OnboardingTourStep.ONBOARDING_COMPLETED] = getOnboardingCompletedStep(args);
    return steps;
}
