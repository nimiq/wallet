import { defaultTooltipModifiers } from '..';
import {
    IOnboardingGetStepFnArgs,
    ITooltipModifier,
    ITourStep,
    IWalletHTMLElements,
    OnboardingTourStep,
} from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBitcoinAddressStep(
    { isSmallScreen, isMediumScreen, isLargeScreen }: IOnboardingGetStepFnArgs): ITourStep {
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
            IWalletHTMLElements.ADDRESS_OVERVIEW_MOBILE_ACTION_BAR,
        ],
        disabledElements: [
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
                return `.account-overview .bitcoin-account ${!isLargeScreen.value
                    ? '> .bitcoin-account-item > svg' : ''}`;
            },
            content: getOnboardingTexts(OnboardingTourStep.BITCOIN_ADDRESS).default,
            params: {
                get placement() {
                    // TODO Add margin in large screens
                    return !isLargeScreen.value ? 'bottom-start' : 'left';
                },
                get modifiers() {
                    let offset;
                    if (isSmallScreen.value) offset = [0, 40];
                    else if (isMediumScreen.value) offset = [0, 20];
                    else offset = [0, 40];

                    return [
                        {
                            name: 'preventOverflow',
                            options: {
                                altAxis: false,
                                padding: 24,
                            },
                        },
                        {
                            name: 'offset',
                            options: { offset },
                        } as ITooltipModifier,
                        ...defaultTooltipModifiers.filter(({ name }) => !['offset', 'preventOverflow'].includes(name)),
                    ];
                },
            },
        },
        ui,
    } as ITourStep;
}
