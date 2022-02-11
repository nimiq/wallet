import { ScreenTypes } from '@/composables/useWindowSize';
import { AccountType, useAccountStore } from '@/stores/Account';
import { computed, SetupContext } from '@vue/composition-api';
import { ITourOrigin, searchComponentByName } from '..';
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getOnboardingTourSteps({ root }: SetupContext, screenTypes: ScreenTypes)
    : ITourSteps<OnboardingTourStep> {
    const toggleHighlightButton = (element: string, highlight: boolean, color: 'gray' | 'orange' | 'green') => {
        const receiveNim = document
            .querySelector(element) as HTMLButtonElement;
        if (!receiveNim) return;
        receiveNim.classList[highlight ? 'add' : 'remove'](`${color}-highlight`);
    };

    // Returns the length of the transaction list for the current active account and active address
    // Easier to access component transaction-list which has already been mounted and has the list
    // of valid transactions for the current active account and active address
    const txsLen = computed<number>(() => (searchComponentByName(root, 'transactions-list') as any).txCount || 0);

    const { state, activeAccountInfo } = useAccountStore();
    const { startedFrom } = (state.tour as { startedFrom: ITourOrigin });
    const { type: accountType, wordsExported } = activeAccountInfo.value || {};
    const accountIsSecured = accountType === AccountType.BIP39 && !!wordsExported;

    const args: IOnboardingGetStepFnArgs = {
        sleep,
        root,
        startedFrom,
        toggleHighlightButton,
        txsLen,
        ...screenTypes,
    };

    return {
        [OnboardingTourStep.FIRST_ADDRESS]: getFirstAddressStep(args),
        [OnboardingTourStep.TRANSACTION_LIST]: getTransactionListStep(args),
        [OnboardingTourStep.FIRST_TRANSACTION]: getFirstTransactionStep(args),
        [OnboardingTourStep.BITCOIN_ADDRESS]: getBitcoinAddressStep(args),
        [OnboardingTourStep.WALLET_BALANCE]: getWalletBalanceStep(args),
        get [OnboardingTourStep.BACKUP_ALERT]() {
            // if the user has already backed up their account, skip this step
            return !accountIsSecured ? getBackupAlertStep(args) : undefined;
        },
        get [OnboardingTourStep.MENU_ICON]() {
            // show only this step if it is a new user and is not in a large screen
            return (!screenTypes.isLargeScreen.value && startedFrom === ITourOrigin.WELCOME_MODAL)
                ? getMenuIconStep() : undefined;
        },
        [OnboardingTourStep.ACCOUNT_OPTIONS]: getAccountOptionsStep(args),
        get [OnboardingTourStep.BACKUP_OPTION_FROM_OPTIONS]() {
            // if the user has already backed up their account, remind the user that he can backup anytime
            if (!accountIsSecured) return undefined;
            return (screenTypes.isLargeScreen.value)
                ? getBackupOptionLargeScreenStep()
                : getBackupOptionNotLargeScreenStep(args);
        },
        [OnboardingTourStep.ONBOARDING_COMPLETED]: getOnboardingCompletedStep(args),
    };
}
