import { watch } from '@vue/composition-api';
import { defaultTooltipModifiers, ITooltipModifier, IWalletHTMLElements } from '..';
import { IOnboardingGetStepFnArgs, ITourStep, OnboardingTourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getTransactionListStep(
    { isSmallScreen, toggleHighlightButton, txsLen }: IOnboardingGetStepFnArgs): ITourStep {
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
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            ...(txsLen.value > 0
                ? [IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS]
                : [
                    `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} h2`,
                    `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} span`,
                ]
            ),
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
        ],
        disabledButtons: [
            IWalletHTMLElements.BUTTON_SIDEBAR_BUY,
            IWalletHTMLElements.BUTTON_SIDEBAR_SELL,
            txsLen.value === 0 ? '' : IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY,
        ],
        scrollLockedElements: [
            `${IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST} .vue-recycle-scroller`,
            `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} .vue-recycle-scroller`,
        ],
        explicitInteractableElements: [
            txsLen.value === 0 ? IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_BUY : '',
        ],
    };

    return {
        get path() {
            return isSmallScreen.value ? '/transactions' : '/';
        },
        tooltip: {
            get target() {
                if (txsLen.value > 0) {
                    return isSmallScreen.value
                        ? `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS}
                                .vue-recycle-scroller__item-view:nth-child(2)`
                        : '.address-overview';
                }
                return isSmallScreen.value
                    ? `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} > .empty-state h2`
                    : '.address-overview';
            },
            get content() {
                return getOnboardingTexts(
                    OnboardingTourStep.TRANSACTION_LIST)[txsLen.value <= 1 ? 'default' : 'alternative'] || [];
            },
            params: {
                get placement() {
                    if (!isSmallScreen.value) {
                        return 'left';
                    }
                    return txsLen.value > 0 ? 'bottom' : 'top';
                },
                get modifiers() {
                    return [
                        {
                            name: 'offset',
                            options: {
                                offset: txsLen.value > 0 && isSmallScreen.value ? [0, 32] : [0, 20],
                            },
                        } as ITooltipModifier,
                        ...defaultTooltipModifiers.filter((d) => d.name !== 'offset'),
                    ];
                },
            },
        },
        lifecycle: {
            mounted: ({ goToNextStep }) => {
                if (txsLen.value > 0) return undefined;

                const unwatch = watch(txsLen, (newVal) => {
                    if (newVal > 0) goToNextStep();
                });

                // Add hightlight effect to 'Get Free NIM' button
                toggleHighlightButton(IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS, true, 'green');
                return () => {
                    unwatch();
                    return toggleHighlightButton(IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS, false, 'green');
                };
            },
        },
        get ui() {
            return {
                ...ui,

                // User is expected to click on the 'Get Free NIM' button
                isNextStepDisabled: txsLen.value === 0,
            };
        },
    };
}
