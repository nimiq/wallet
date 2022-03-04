import { ref, watch } from '@vue/composition-api';
import { defaultTooltipModifiers, ITooltipModifier, IWalletHTMLElements } from '..';
import { IOnboardingGetStepFnArgs, ITourStep, OnboardingTourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getTransactionListStep(
    { isSmallScreen, toggleHighlightButton, txsLen }: IOnboardingGetStepFnArgs): ITourStep {
    const freeNimBtn = ref(() =>
        document.querySelector(IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM) as HTMLDivElement);

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
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
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
                const textType = txsLen.value === 0 && freeNimBtn.value ? 'default' : 'alternative';
                return getOnboardingTexts(OnboardingTourStep.TRANSACTION_LIST)[textType] || [];
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
            mounted: ({ goToNextStep, isNextStepDisabled }) => {
                if (txsLen.value > 0) return undefined;

                function freeNimBtnClickHandler() {
                    setTimeout(() => {
                        // User in the mainnet is expected to click on the 'Get Free NIM' button
                        // This button opens the faucet page and the user exits the wallet. Once the user finishes, he
                        // is expected to return to the wallet and automatically the tour will go to the next step.
                        // There might be a possibility that the user gets an error in the faucet, and therefore, the
                        // tour will not continue. In those cases we will let the user click 'Next step' but it will
                        // actually skip the third step and go to the fourth step
                        // FIXME: In the future, if we integrate the faucet into the wallet, we could improve this
                        // behaviour
                        if (txsLen.value > 0) return;
                        isNextStepDisabled.value = false;
                    }, 2000);
                }

                if (freeNimBtn.value() !== null) {
                    freeNimBtn.value().addEventListener('click', freeNimBtnClickHandler, { once: true });
                } else {
                    isNextStepDisabled.value = false;
                }

                const unwatch = watch(txsLen, (newVal) => {
                    if (newVal > 0) goToNextStep();
                });

                // Add hightlight effect to 'Get Free NIM' button. This will be ignored if the user have at least one tx
                toggleHighlightButton(IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM, true, 'green');
                return () => {
                    unwatch();
                    if (freeNimBtn.value()) {
                        freeNimBtn.value().removeEventListener('click', freeNimBtnClickHandler);
                    }
                    return toggleHighlightButton(
                        IWalletHTMLElements.BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM, false, 'green');
                };
            },
        },
        get ui() {
            return {
                ...ui,

                // User is expected to click on the 'Get Free NIM' button if they have not txs
                isNextStepDisabled: txsLen.value === 0,
            };
        },
    };
}
