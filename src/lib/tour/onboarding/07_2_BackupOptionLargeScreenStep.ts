import { defaultTooltipModifiers, IWalletHTMLElements } from '..';
import { OnboardingTourStep, ITourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getBackupOptionLargeScreenStep(): ITourStep {
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
            target: IWalletHTMLElements.SIDEBAR_ACCOUNT_MENU,
            content: getOnboardingTexts(OnboardingTourStep.BACKUP_OPTION_FROM_OPTIONS).default,
            params: {
                placement: 'right',
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 32],
                        },
                    },
                    ...defaultTooltipModifiers.filter(({ name }) => name !== 'offset'),
                ],
            },
        },
        ui,
    } as ITourStep;
}
