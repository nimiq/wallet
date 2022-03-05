import { defaultTooltipModifiers, IWalletHTMLElements } from '..';
import { OnboardingTourStep, ITourStep, IOnboardingGetStepFnArgs } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getAccountOptionsStep({ isSmallScreen, isLargeScreen }: IOnboardingGetStepFnArgs): ITourStep {
    const ui: ITourStep['ui'] = {
        fadedElements: [
            IWalletHTMLElements.SIDEBAR_TESTNET,
            IWalletHTMLElements.SIDEBAR_LOGO,
            IWalletHTMLElements.SIDEBAR_ANNOUNCMENT_BOX,
            IWalletHTMLElements.SIDEBAR_PRICE_CHARTS,
            IWalletHTMLElements.SIDEBAR_TRADE_ACTIONS,
            IWalletHTMLElements.SIDEBAR_NETWORK,
            IWalletHTMLElements.SIDEBAR_SETTINGS,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
            IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            IWalletHTMLElements.SIDEBAR_MOBILE_TAP_AREA,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BACKUP_ALERT,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_TABLET_MENU_BAR,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_ADDRESS_LIST,
            IWalletHTMLElements.ACCOUNT_OVERVIEW_BITCOIN,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS_MOBILE,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIVE_ADDRESS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_ACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_TRANSACTIONS,
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
            IWalletHTMLElements.MODAL_CONTAINER,
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
            return isLargeScreen.value ? '/accounts' : '/accounts?sidebar=true';
        },
        tooltip: {
            get target() {
                return isSmallScreen.value ? IWalletHTMLElements.MODAL_ACCOUNT_PICTURE : IWalletHTMLElements.MODAL_PAGE;
            },
            content: getOnboardingTexts(OnboardingTourStep.ACCOUNT_OPTIONS).default,
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom-start' : 'right';
                },
                get modifiers() {
                    return [
                        {
                            name: 'offset',
                            options: {
                                offset: [isSmallScreen.value ? -13.5 : 0, 16],
                            },
                        },
                        {
                            name: 'preventOverflow',
                            options: {
                                altAxis: true,
                                padding: 8,
                            },
                        },
                        ...defaultTooltipModifiers.filter(({ name }) => !['offset', 'preventOverflow'].includes(name)),
                    ];
                },
            },
        },
        ui,
    } as ITourStep;
}
