import { useWindowSize } from '@/composables/useWindowSize';
import { AccountType, useAccountStore } from '@/stores/Account';
import { SetupContext } from '@vue/composition-api';
import { searchComponentByName, TourName } from '..';
import { OnboardingGetStepFnArgs, OnboardingTourStep, TourSteps } from '../types';
import { getFirstAddressStep } from './01_FirstAddressStep';
import { getTransactionListStep } from './02_TransactionListStep';
import { getFirstTransactionStep } from './03_FirstTransactionStep';
import { getBitcoinAddressStep } from './04_BitcoinAddressStep';
import { getWalletBalanceStep } from './05_WalletBalanceStep';
import { getBackupAlertStep } from './06_0_BackupAlertStep';
import { getMenuIconStep } from './06_1_MenuIconStep';
import { getBackupOptionNotLargeScreenStep } from './07_1_BackupOptionNotLargeScreenStep';
import { getBackupOptionLargeScreenStep } from './07_2_BackupOptionLargeScreenStep';
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

    const { state, activeAccountInfo } = useAccountStore();
    const isANewUser = (state.tour?.name === TourName.ONBOARDING && state.tour?.isANewUser);
    const { type: accountType, fileExported: _fileExported } = activeAccountInfo.value || {};
    const fileExported = (accountType === AccountType.BIP39 && !_fileExported);

    const openAccountOptions = async () => {
        const accountMenu = searchComponentByName(root, 'account-menu') as any;
        if (!accountMenu || !('closeMenu' in accountMenu)
            || !('menuOpen' in accountMenu) || accountMenu.menuOpen) {
            return;
        }
        accountMenu.openMenu();
        await sleep(500);
    };
    const closeAccountOptions = async () => {
        const modal = searchComponentByName(root, 'modal') as any;

        if ('close' in modal) {
            modal.close();
            await sleep(500);
        }
    };

    const args: OnboardingGetStepFnArgs = {
        sleep,
        toggleDisabledAttribute,
        root,
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
        isANewUser,
        openAccountOptions,
        closeAccountOptions,
    };

    const steps: TourSteps<OnboardingTourStep> = {
        [OnboardingTourStep.FIRST_ADDRESS]: getFirstAddressStep(args),
        [OnboardingTourStep.TRANSACTION_LIST]: getTransactionListStep(args),
        [OnboardingTourStep.FIRST_TRANSACTION]: getFirstTransactionStep(args),
        [OnboardingTourStep.BITCOIN_ADDRESS]: getBitcoinAddressStep(args),
        [OnboardingTourStep.WALLET_BALANCE]: getWalletBalanceStep(args),
        [OnboardingTourStep.ACCOUNT_OPTIONS]: getAccountOptionsStep(
            { ...args, keepMenuOpenOnForward: fileExported && !isLargeScreen.value }),
        [OnboardingTourStep.ONBOARDING_COMPLETED]: getOnboardingCompletedStep(args),
    };
    if (!fileExported) {
        steps[OnboardingTourStep.BACKUP_ALERT] = getBackupAlertStep(args);
    }
    if (!isLargeScreen.value && isANewUser) {
        steps[OnboardingTourStep.MENU_ICON] = getMenuIconStep(args);
    }
    if (fileExported && isLargeScreen.value) {
        steps[OnboardingTourStep.BACKUP_OPTION_LARGE_SCREENS] = getBackupOptionLargeScreenStep(args);
    }
    if (fileExported && !isLargeScreen.value) {
        steps[OnboardingTourStep.BACKUP_OPTION_NOT_LARGE_SCREENS] = getBackupOptionNotLargeScreenStep(args);
    }
    return steps;
}
