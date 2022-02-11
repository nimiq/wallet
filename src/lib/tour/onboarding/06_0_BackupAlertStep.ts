import { useAccountStore } from '@/stores/Account';
import { watch } from '@vue/composition-api';
import { defaultTooltipModifiers, ITourOrigin, IWalletHTMLElements, searchComponentByName } from '..';
import { IOnboardingGetStepFnArgs, ITourStep, OnboardingTourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBackupAlertStep(
    { isSmallScreen, startedFrom, toggleHighlightButton, root }: IOnboardingGetStepFnArgs): ITourStep {
    const ui: ITourStep['ui'] = {
        fadedElements: [
            IWalletHTMLElements.SIDEBAR_TESTNET,
            IWalletHTMLElements.SIDEBAR_LOGO,
            IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
            IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            IWalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            IWalletHTMLElements.SIDEBAR_NETWORK,
            IWalletHTMLElements.SIDEBAR_SETTINGS,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledButtons: [
            IWalletHTMLElements.BUTTON_SIDEBAR_BUY,
            IWalletHTMLElements.BUTTON_SIDEBAR_SELL,
            IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
        scrollLockedElements: [
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} .vue-recycle-scroller`,
        ],
    };
    return {
        path: '/',
        tooltip: {
            get target() {
                return isSmallScreen.value
                    ? `${IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT} button`
                    : IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT;
            },
            content: getOnboardingTexts(OnboardingTourStep.BACKUP_ALERT)[
                startedFrom === ITourOrigin.WELCOME_MODAL ? 'default' : 'alternative'] || [],
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom' : 'right';
                },
                get modifiers() {
                    return [
                        {
                            name: 'preventOverflow',
                            options: {
                                altAxis: false,
                                padding: 8,
                            },
                        },
                        {
                            name: 'offset',
                            options: {
                                offset: isSmallScreen.value ? [0, 10] : [0, 16],
                            },
                        },
                        ...defaultTooltipModifiers.filter(({ name }) => !['preventOverflow', 'offset'].includes(name)),
                    ];
                },
            },
        },
        ui,
        lifecycle: {
            mounted: () => {
                const unwatch = watch(useAccountStore().activeAccountInfo, async (newVal) => {
                    if (newVal?.wordsExported) {
                        // If user clicks "save recover words" and completes the process, we
                        // no longer need to show the user this step, therefore, we execute
                        // setTourAsArray again, and go to the next step which in reality will have
                        // same index
                        const nimiqTourInstance = searchComponentByName(root, 'nimiq-tour') as any;
                        if (!nimiqTourInstance) return;

                        nimiqTourInstance.setTourAsArray();
                        nimiqTourInstance.currentStep -= 1;

                        setTimeout(() => nimiqTourInstance.goToNextStep(), 500);
                    }
                });

                // hightlight 'Revover words' button
                toggleHighlightButton(IWalletHTMLElements.BUTTON_ADDRESS_BACKUP_ALERT, true, 'orange');
                return () => {
                    unwatch();
                    toggleHighlightButton(IWalletHTMLElements.BUTTON_ADDRESS_BACKUP_ALERT, false, 'orange');
                };
            },
        },
    } as ITourStep;
}
