import { useBtcAddressStore } from '@/stores/BtcAddress';
import { defaultTooltipModifiers } from '..';
import { IOnboardingGetStepFnArgs, ITourStep, IWalletHTMLElements, OnboardingTourStep } from '../types';
import { getOnboardingTexts } from './OnboardingTourTexts';

export function getWalletBalanceStep({ isSmallScreen }: IOnboardingGetStepFnArgs): ITourStep {
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

    const { accountBalance: btcAccountBalance } = useBtcAddressStore();
    const hasBitcoin = () => btcAccountBalance.value > 0;

    return {
        path: '/',
        tooltip: {
            get target() {
                return `${IWalletHTMLElements.ACCOUNT_OVERVIEW_BALANCE} .balance-distribution  
                ${!isSmallScreen.value ? '.btc .tooltip .bar' : ''}`;
            },
            content: getOnboardingTexts(OnboardingTourStep.WALLET_BALANCE)[!hasBitcoin() ? 'default' : 'alternative'],
            params: {
                get placement() {
                    return isSmallScreen.value ? 'bottom' : 'right';
                },
                get modifiers() {
                    return [
                        {
                            name: 'preventOverflow',
                            options: {
                                mainAxis: false,
                                padding: 8,
                            },
                        },
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 16],
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
