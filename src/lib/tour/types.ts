import { useWindowSize } from '@/composables/useWindowSize';
import { SetupContext } from '@vue/composition-api';
import { NodeHexagon } from '../NetworkMap';

export enum TourName { ONBOARDING = 'onboarding', NETWORK = 'network' }

export enum OnboardingTourStep {
    FIRST_ADDRESS,
    TRANSACTION_LIST,
    FIRST_TRANSACTION,
    BITCOIN_ADDRESS,
    WALLET_BALANCE,
    BACKUP_ALERT,
    MENU_ICON,
    BACKUP_OPTION_LARGE_SCREENS,
    ACCOUNT_OPTIONS,
    BACKUP_OPTION_NOT_LARGE_SCREENS,
    ONBOARDING_COMPLETED
}

export enum NetworkTourStep {
    YOUR_LOCATION,
    BACKBONE_NODE,
    METRICS,
    NETWORK_COMPLETED
}

export type TourStepIndex = OnboardingTourStep | NetworkTourStep;

// eslint-disable-next-line max-len
// https://github.com/floating-ui/floating-ui/blob/59d15d4f81a2d71d9b42d836e47d7114bc32f7f2/packages/core/src/types.ts#L4
type Alignment = 'start' | 'end';
type BasePlacement = 'top' | 'right' | 'bottom' | 'left';
type AlignedPlacement = `${BasePlacement}-${Alignment}`;
export type Placement = BasePlacement | AlignedPlacement;

export interface LifecycleArgs {
    goToNextStep: () => void;
    goingForward: boolean;
    ending: boolean;
}

export type MountedReturnFn = ((args: Omit<LifecycleArgs, 'goToNextStep'>) => Promise<void> | void);

export interface TourStep {
    path: '/' | '/transactions' | '/?sidebar=true' | '/network';

    // data for the steps of v-tour
    tooltip: {
        target: string,
        content: (string | string[])[],
        params: {
            placement: BasePlacement | AlignedPlacement,
        },
        button?: {
            text: string,
            fn: (callback?: () => Promise<void>) => void,
        },
    };

    lifecycle?: {
        created?: (args: Omit<LifecycleArgs, 'ending'>) => Promise<void> | void,
        mounted?: (args: LifecycleArgs) =>
            MountedReturnFn | Promise<MountedReturnFn | void> | void,
    };

    ui: {
        // Elements that must have opacity to focus attention in other elements in screen
        fadedElements?: string[], // array of selectors

        // Elements that shouldn't allow interactivity
        disabledElements?: string[], // array of selectors

        isNextStepDisabled?: boolean,

        disabledButtons?: string[],
    };
}

export type TourSteps<T extends number> = {
    [x in T]?: TourStep;
};

export type OnboardingGetStepFnArgs =
    Pick<ReturnType<typeof useWindowSize>, 'isSmallScreen' | 'isMediumScreen' | 'isLargeScreen'> &
    {
        root: SetupContext['root'],
        toggleDisabledAttribute: (selector: string, disabled: boolean) => Promise<void>,
        sleep: (ms: number) => Promise<unknown>,
        isANewUser: boolean,
        openAccountOptions: () => Promise<void>,
        closeAccountOptions: () => Promise<void>,
    };

export type NetworkGetStepFnArgs =
    Pick<ReturnType<typeof useWindowSize>, 'isSmallScreen' | 'isMediumScreen' | 'isLargeScreen'> & {
        nodes: () => NodeHexagon[],
        selfNodeIndex: number,
        scrollIntoView: (x: number) => void,
        sleep: (ms: number) => Promise<unknown>,
    }

export type TourBroadcast = TourBroadcastEnd | TourBroadcastStepChanged | TourBroadcastClickedOutsideTour

interface TourBroadcastEnd {
    type: 'end-tour';
}

interface TourBroadcastClickedOutsideTour {
    type: 'clicked-outside-tour';
}

export interface TourBroadcastStepChanged {
    type: 'tour-step-changed';
    payload: {
        currentStep: TourStepIndex,
        nSteps: number,
    };
}

export enum WalletHTMLElements {
    SIDEBAR_TESTNET = '.sidebar .testnet-notice',
    SIDEBAR_LOGO = '.sidebar .logo',
    SIDEBAR_PRICE_CHARTS = '.sidebar .price-chart-wrapper',
    SIDEBAR_TRADE_ACTIONS = '.sidebar .trade-actions',
    SIDEBAR_ACCOUNT_MENU = '.sidebar .account-menu',
    SIDEBAR_NETWORK = '.sidebar .network',
    SIDEBAR_SETTINGS = '.sidebar .settings',
    SIDEBAR_MOBILE_TAP_AREA = '.mobile-tap-area',

    ACCOUNT_OVERVIEW_BACKUP_ALERT = '.account-overview .backup-warning',
    ACCOUNT_OVERVIEW_TABLET_MENU_BAR = '.account-overview .mobile-menu-bar',
    ACCOUNT_OVERVIEW_BALANCE = '.account-overview .account-balance-container',
    ACCOUNT_OVERVIEW_ADDRESS_LIST = '.account-overview .address-list',
    ACCOUNT_OVERVIEW_BITCOIN = '.account-overview .bitcoin-account',
    ACCOUNT_OVERVIEW_MOBILE_ACTION_BAR = '.account-overview .mobile-action-bar',

    ADDRESS_OVERVIEW = '.address-overview',
    ADDRESS_OVERVIEW_ACTIONS_MOBILE = '.address-overview .actions-mobile',
    ADDRESS_OVERVIEW_ACTIVE_ADDRESS = '.address-overview .active-address',
    ADDRESS_OVERVIEW_ACTIONS = '.address-overview .actions',
    ADDRESS_OVERVIEW_TRANSACTIONS = '.address-overview .transaction-list',
    ADDRESS_OVERVIEW_MOBILE_ACTION_BAR = '.address-overview .mobile-action-bar',

    BUTTON_SIDEBAR_BUY = '.sidebar .trade-actions button:nth-child(1)',
    BUTTON_SIDEBAR_SELL = '.sidebar .trade-actions button:nth-child(2)',
    BUTTON_ADDRESS_OVERVIEW_BUY = '.address-overview .transaction-list .after-first-tx button',
    BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM = '.address-overview .transaction-list .empty-state button',

    MODAL_CONTAINER = '.modal.backdrop',
    MODAL_WRAPPER = '.modal .wrapper',
    MODAL_PAGE = '.modal .small-page',
    MODAL_CLOSE_BUTTON = '.modal .close-button',

    NETWORK_STATS = '.network .network-stats',
    NETWORK_MAP = '.network .network-map',
    NETWORK_NODES = '.network .network-map .nodes',
    NETWORK_SCROLLER = '.network .scroller',
    NETWORK_TABLET_MENU_BAR = '.network .menu-bar',
}
