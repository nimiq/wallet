import { defaultTooltipModifiers, IWalletHTMLElements } from '..';
import { IOnboardingGetStepFnArgs, ITooltipModifier, ITourStep, OnboardingTourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getFirstTransactionStep({ isSmallScreen, txsLen }: IOnboardingGetStepFnArgs): ITourStep {
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
        get path() {
            return isSmallScreen.value ? '/transactions' : '/';
        },
        tooltip: {
            get target() {
                return `${IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS} ${isSmallScreen.value
                    ? '.transaction > .identicon'
                    : '.vue-recycle-scroller__item-view:nth-child(2)'}`;
            },
            content: getOnboardingTexts(OnboardingTourStep.FIRST_TRANSACTION)[
                txsLen.value <= 1 ? 'default' : 'alternative'],
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom-start' : 'left';
                },
                get modifiers() {
                    return [
                        {
                            name: 'offset',
                            options: {
                                offset: isSmallScreen.value ? [0, 10] : [0, -4],
                            },
                        } as ITooltipModifier,
                        ...defaultTooltipModifiers.filter((d) => d.name !== 'offset'),
                    ];
                },
            },
        },
        ui,
    } as ITourStep;
}
