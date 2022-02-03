import { useWindowSize } from '@/composables/useWindowSize';
import { AccountType, useAccountStore } from '@/stores/Account';
import { SetupContext } from '@vue/composition-api';
import { ITourOrigin } from '..';
import { IOnboardingGetStepFnArgs, ITourSteps, OnboardingTourStep } from '../types';
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

export function getOnboardingTourSteps({ root }: SetupContext): ITourSteps<OnboardingTourStep> {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const toggleDisabledAttribute = async (selector: string, disabled: boolean) => {
        const el = document.querySelector(selector) as HTMLButtonElement;
        if (el) {
            el.disabled = disabled;
            await root.$nextTick();
        }
    };

    const toggleHighlightButton = (element: string, highlight: boolean, color: 'gray' | 'organge' | 'green') => {
        const receiveNim = document
            .querySelector(element) as HTMLButtonElement;
        if (!receiveNim) return;
        receiveNim.classList[highlight ? 'add' : 'remove'](`${color}-highlight`);
    };

    const { isSmallScreen, isMediumScreen, isLargeScreen } = useWindowSize();

    const { state, activeAccountInfo } = useAccountStore();
    const { startedFrom } = (state.tour as { startedFrom: ITourOrigin });
    const { type: accountType, wordsExported } = activeAccountInfo.value || {};
    const accountIsSecured = accountType === AccountType.BIP39 && !!wordsExported;

    const args: IOnboardingGetStepFnArgs = {
        sleep,
        toggleDisabledAttribute,
        root,
        isSmallScreen,
        isMediumScreen,
        isLargeScreen,
        startedFrom,
        toggleHighlightButton,
    };

    const steps: ITourSteps<OnboardingTourStep> = {
        [OnboardingTourStep.FIRST_ADDRESS]: getFirstAddressStep(args),
        [OnboardingTourStep.TRANSACTION_LIST]: getTransactionListStep(args),
        [OnboardingTourStep.FIRST_TRANSACTION]: getFirstTransactionStep(args),
        [OnboardingTourStep.BITCOIN_ADDRESS]: getBitcoinAddressStep(args),
        [OnboardingTourStep.WALLET_BALANCE]: getWalletBalanceStep(args),
        [OnboardingTourStep.ACCOUNT_OPTIONS]: getAccountOptionsStep(args),
        [OnboardingTourStep.ONBOARDING_COMPLETED]: getOnboardingCompletedStep(args),
    };
    if (!accountIsSecured) {
        steps[OnboardingTourStep.BACKUP_ALERT] = getBackupAlertStep(args);
    }
    if (!isLargeScreen.value && startedFrom === ITourOrigin.WELCOME_MODAL) {
        steps[OnboardingTourStep.MENU_ICON] = getMenuIconStep();
    }
    if (accountIsSecured && isLargeScreen.value) {
        // TODO KeepmenuopenonBackward
        steps[OnboardingTourStep.BACKUP_OPTION_LARGE_SCREENS] = getBackupOptionLargeScreenStep();
    }
    if (accountIsSecured && !isLargeScreen.value) {
        steps[OnboardingTourStep.BACKUP_OPTION_NOT_LARGE_SCREENS] = getBackupOptionNotLargeScreenStep(args);
    }
    return steps;
}
