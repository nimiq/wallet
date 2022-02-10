import { ScreenTypes } from '@/composables/useWindowSize';
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
    BACKUP_OPTION_FROM_OPTIONS,
    ACCOUNT_OPTIONS,
    ONBOARDING_COMPLETED
}

export enum NetworkTourStep {
    YOUR_LOCATION,
    BACKBONE_NODE,
    METRICS,
    NETWORK_COMPLETED
}

export type TourStepIndex = OnboardingTourStep | NetworkTourStep;

// Tooltip placement
// eslint-disable-next-line max-len
// https://github.com/floating-ui/floating-ui/blob/59d15d4f81a2d71d9b42d836e47d7114bc32f7f2/packages/core/src/types.ts#L4
type Alignment = 'start' | 'end';
type BasePlacement = 'top' | 'right' | 'bottom' | 'left';
type AlignedPlacement = `${BasePlacement}-${Alignment}`;
export type Placement = BasePlacement | AlignedPlacement;

export interface ITooltipModifier {
    name: 'preventOverflow' | 'offset' | 'arrow';
    options: any;
}

export interface ILifecycleArgs {
    goToNextStep: () => void;
    goingForward: boolean;
    ending: boolean;
}

export type IUnmountedFn = ((args: Omit<ILifecycleArgs, 'goToNextStep'>) => Promise<void> | void);

// This interface is the main interface for a step in the tour. It consists of:
//      - path - the route that the step should be shown on
//      - tooltip - the tooltip content and configuration for the step. It is using popperJS as dependency
//      - ui - the UI elements that should be faded out and disabled during the step along with other UI config
//      - lifecycle - the lifecycle hooks for the step. Read more at the top of the file of Tour.vue file
export interface ITourStep {
    path: `/${'' | 'transactions' | 'accounts' | 'network'}${'' | '?sidebar=true'}`;

    // data for the steps of v-tour
    tooltip: {

        // selector for the element that the tooltip should be attached to
        target: string,

        // If the content is an array of string it will be displayed as a list
        // otherwise it will be displayed as a paragraph.
        // Some lines can use a string from type IContentSpecialItem
        content: (string | string[] | IContentSpecialItem)[],

        // This configuration is the same as the one used in popperJS
        params: {
            placement: BasePlacement | AlignedPlacement,
            modifiers?: ITooltipModifier[] | void,
        },

        // Some steps required a custom button in the bottom of the tooltip
        button?: {
            text: string,
            fn: (callback?: () => Promise<void>) => void,
        },
    };

    // function to call when the step is changed. Read more at Tour.vue file
    lifecycle?: {
        created?: (args: Omit<ILifecycleArgs, 'ending'>) => Promise<void> | void,
        mounted?: (args: ILifecycleArgs) => IUnmountedFn | Promise<IUnmountedFn | void> | void,
    };

    ui: {
        // Elements that must have opacity to focus attention in other elements in screen
        fadedElements?: string[], // array of selectors

        // Elements that shouldn't allow interactivity
        disabledElements?: string[], // array of selectors

        // Allow user to go to the next step using buttons from the tour
        // If false, user is required to make a click in a button which is not part of the tour
        isNextStepDisabled?: boolean,

        // Buttons with primary classes are disabled
        disabledButtons?: string[],

        // Elements that cannot be scrolled. See more at Tour.vue@_onScrollInLockedElement
        scrollLockedElements?: string[],

        // Elements that are expected to be clicked by the user. If they are clicked, the tour
        // will ignore them and will not make the flash animation
        explicitInteractableElements?: string[],
    };
}

// x will be the index of the step in the tour
// JSON objects have strings as keys normally, but JS also can work with
// numbers as keys which is more convinient for us in this case
export type ITourSteps<T extends number> = {
    [x in T]?: ITourStep;
};

// From which part the user can start the tour
export enum ITourOrigin {
    SETTINGS = 'settings',
    WELCOME_MODAL = 'welcome-modal',
}

export type ITourStepTexts<T extends number> = {
    [x in T]: {
        default: (string | string[])[], alternative?: string[],
    }
}

// Every step is defined in its own file as a function. The function receives this interface as a parameter
export type IOnboardingGetStepFnArgs = ScreenTypes & {
    root: SetupContext['root'],
    sleep: (ms: number) => Promise<unknown>,
    startedFrom: ITourOrigin,
    toggleHighlightButton: (selector: string, highlight: boolean, color: 'gray' | 'orange' | 'green') => void,
    txsLen: () => number,
};

// Every step is defined in its own file as a function. The function receives this interface as a parameter
export type INetworkGetStepFnArgs = ScreenTypes & {
    root: SetupContext['root'],
    nodes: () => NodeHexagon[], // nodes on the map
    selfNodeIndex: number,
    scrollIntoView: (x: number) => void,
    sleep: (ms: number) => Promise<unknown>,
}

// Events that will be used to communicate between LargeScreenTourManager.vue and Tour.vue
export type ITourBroadcast = ITourBroadcastEnd | ITourBroadcastStepChanged | ITourBroadcastClickedOutsideTour

interface ITourBroadcastEnd {
    type: 'end-tour';
}

interface ITourBroadcastClickedOutsideTour {
    type: 'clicked-outside-tour';
}

export interface ITourBroadcastStepChanged {
    type: 'tour-step-changed';
    payload: {
        currentStep: TourStepIndex,
        nSteps: number,
    };
}

// Some steps contain texts with special requirements
export enum IContentSpecialItem {
    HR = '{HR}',
    ICON_NETWORK_WORLD = '{network_icon}',
    ICON_ACCOUNT = '{account_icon}',
    BACK_TO_ADDRESSES = '{back_to_addresses}',
}

// Elements that are need to be opacified or non-interactive at some point during the tour
export enum IWalletHTMLElements {
    SIDEBAR_TESTNET = '.sidebar .testnet-notice',
    SIDEBAR_LOGO = '.sidebar .logo',
    SIDEBAR_ANNOUNCMENT_BOX = '.sidebar .announcement-box',
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

    ADDRESS_OVERVIEW_ACTIONS_MOBILE = '.address-overview .actions-mobile',
    ADDRESS_OVERVIEW_ACTIVE_ADDRESS = '.address-overview .active-address',
    ADDRESS_OVERVIEW_ACTIONS = '.address-overview .actions',
    ADDRESS_OVERVIEW_TRANSACTIONS = '.address-overview .transaction-list',
    ADDRESS_OVERVIEW_MOBILE_ACTION_BAR = '.address-overview .mobile-action-bar',

    BUTTON_SIDEBAR_BUY = '.sidebar .trade-actions button:nth-child(1)',
    BUTTON_SIDEBAR_SELL = '.sidebar .trade-actions button:nth-child(2)',
    BUTTON_ADDRESS_OVERVIEW_BUY = '.address-overview .transaction-list .after-first-tx button',
    BUTTON_ADDRESS_OVERVIEW_RECEIVE_FREE_NIM = '.address-overview .transaction-list .empty-state button',
    BUTTON_ADDRESS_BACKUP_ALERT = '.account-overview .backup-warning button',

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
