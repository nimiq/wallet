import { useAccountStore } from '@/stores/Account';
import { Transaction, useTransactionsStore } from '@/stores/Transactions';
import { SetupContext } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';
import { CryptoCurrency } from '../lib/Constants';

export type TourName = 'onboarding' | 'network'

enum MobileOnboardingTourStep {
    FIRST_ADDRESS,
    TRANSACTIONS_LIST,
    FIRST_TRANSACTION,
    BITCOIN_ADDRESS,
    WALLET_BALANCE,
    RECOVERY_WORDS_ALERT,
    MENU_ICON,
    ACCOUNT_OPTIONS,
    ONBOARDING_COMPLETED
}

enum NetworkTourStep {
    TODO,
}

export type TourStepIndex = MobileOnboardingTourStep | NetworkTourStep;

// eslint-disable-next-line max-len
// https://github.com/floating-ui/floating-ui/blob/59d15d4f81a2d71d9b42d836e47d7114bc32f7f2/packages/core/src/types.ts#L4
type Alignment = 'start' | 'end';
type BasePlacement = 'top' | 'right' | 'bottom' | 'left';
type AlignedPlacement = `${BasePlacement}-${Alignment}`;
export type Placement = BasePlacement | AlignedPlacement;

export interface LifecycleArgs {
    goToNextStep: () => void;
    goingForward: boolean;
}

export type MountedReturnFn = ((args?: { goingForward: boolean, ending?: boolean }) => Promise<void> | void);

export interface TourStep {
    path: '/' | '/transactions' | '/?sidebar=true' | '/network';

    // data for the steps of v-tour
    tooltip: {
        target: string,
        content: string[],
        params: {
            placement: BasePlacement | AlignedPlacement,
        },
        button?: {
            text: string,
            fn: () => void,
        },
    };

    lifecycle?: {
        created?: (args: LifecycleArgs) => Promise<void> | void,
        mounted?: (args: LifecycleArgs) => MountedReturnFn | Promise<MountedReturnFn | void> | void,
    };

    ui: {
        // Elements that must have opacity to focus attention in other elements in screen
        fadedElements?: string[], // array of selectors

        // Elements that shouldn't allow interactivity
        disabledElements?: string[], // array of selectors

        isNextStepDisabled?: boolean,
    };
}

export type TourSteps<T extends number> = {
    [x in T]: TourStep;
};

// TODO Remove me
export function useFakeTx(): Transaction {
    return {
        transactionHash: '0x123',
        format: 'basic',
        timestamp: 1532739000,
        sender: 'NQ02 YP68 BA76 0KR3 QY9C SF0K LP8Q THB6 LTKU',
        recipient: useAddressStore().activeAddress.value || 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
        senderType: 'basic',
        recipientType: 'basic',
        blockHeight: 1,
        blockHash: '0x123456789ABCDEF',
        value: 100_000,
        fee: 1,
        feePerByte: 1,
        validityStartHeight: 1,
        network: 'testnet',
        flags: 0,
        data: {
            raw: 'My awesome data',
        },
        proof: {
            raw: 'ES256K',
        },
        size: 1,
        valid: true,
        state: 'confirmed',
    };
}
function getOnboardingTourSteps({ root }: SetupContext): TourSteps<MobileOnboardingTourStep> {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const toggleDisabledAttribute = async (selector: string, disabled: boolean) => {
        const el = document.querySelector(selector) as HTMLButtonElement;
        if (el) {
            el.disabled = disabled;
            await root.$nextTick();
        }
    };

    const steps: TourSteps<MobileOnboardingTourStep> = {
        [MobileOnboardingTourStep.FIRST_ADDRESS]: {
            path: '/',
            tooltip: {
                target: '.address-list > .address-button .identicon img',
                content: [
                    'This is your first address, represented by your avatar.',
                    'Tap it to open the address details.',
                ],
                params: {
                    placement: 'bottom-start',
                },
            },
            lifecycle: {
                created: () => {
                    const { setActiveCurrency } = useAccountStore();
                    const { addressInfos, selectAddress } = useAddressStore();
                    setActiveCurrency(CryptoCurrency.NIM);
                    selectAddress(addressInfos.value[0].address);
                },
                mounted: ({ goToNextStep }) => {
                    const addressButton = document
                        .querySelector('.address-list > .address-button') as HTMLButtonElement;

                    let addressClicked = false;
                    const onClick = (e: MouseEvent) => {
                        addressClicked = true;
                        goToNextStep();
                        e.preventDefault();
                        e.stopPropagation();
                    };

                    addressButton!.addEventListener('click', onClick, { once: true, capture: true });

                    return async (args) => {
                        if (!args?.ending && !addressClicked
                            && root.$route.path === steps[MobileOnboardingTourStep.FIRST_ADDRESS].path) {
                            addressButton!.click();
                            await root.$nextTick();
                        }
                        addressButton!.removeEventListener('click', onClick, true);
                    };
                },
            },
            ui: {
                fadedElements: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .bitcoin-account',
                    '.account-overview .account-balance-container',
                    '.account-overview .mobile-action-bar',
                ],
            },
        },
        [MobileOnboardingTourStep.TRANSACTIONS_LIST]: {
            path: '/transactions',
            tooltip: {
                target: '.transaction-list > .empty-state h2',
                content: [
                    'This is where all your transactions will appear.',
                    'Click the green button to receive a free NIM from Team Nimiq.',
                ],
                params: {
                    placement: 'top',
                },
            },
            lifecycle: {
                mounted: () => {
                    const { transactions } = useTransactionsStore().state;

                    if (Object.values(transactions.value || []).length === 0) {
                        const unwatch = root.$watch(() => useTransactionsStore().state.transactions, (txs) => {
                            if (!Object.values(txs).length) {
                                unwatch();
                                return;
                            }

                            // Once the user has at least one transaction, tooltip in step TRANSACTIONS_LIST
                            // is modified
                            steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].tooltip = {
                                target: '.vue-recycle-scroller__item-wrapper',
                                content: ['This is where all your transactions will appear.'],
                                params: {
                                    placement: 'bottom',
                                },
                            };
                            steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].ui.isNextStepDisabled = false;
                            toggleDisabledAttribute('.address-overview .transaction-list a button', true);
                            steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].lifecycle = {
                                created: async () => {
                                    await toggleDisabledAttribute(
                                        '.address-overview .transaction-list a button', true);
                                },
                                mounted() {
                                    return (args) => {
                                        if (args?.ending || !args?.goingForward) {
                                            setTimeout(() => {
                                                toggleDisabledAttribute(
                                                    '.address-overview .transaction-list a button', false);
                                            }, args?.ending ? 0 : 1000);
                                        }
                                    };
                                },
                            };
                            unwatch();
                        });
                    }
                },
            },
            ui: {
                fadedElements: [
                    '.address-overview .mobile-action-bar',
                ],
                disabledElements: [
                    '.address-overview .actions-mobile',
                    '.address-overview .active-address',
                ],
                isNextStepDisabled: true,
            },
        },
        [MobileOnboardingTourStep.FIRST_TRANSACTION]: {
            path: '/transactions',
            tooltip: {
                target: '.transaction-list .list-element > .transaction > .identicon',
                content: [
                    "Here's your first transaction with your first NIM.",
                    'Every NIM address comes with an avatar. They help to make sure you got the right one.',
                ],
                params: {
                    placement: 'bottom-start',
                },
            },
            lifecycle: {
                created: async () => {
                    await toggleDisabledAttribute('.address-overview .transaction-list a button', true);
                },
                mounted() {
                    return (args) => {
                        if (args?.ending || args?.goingForward) {
                            setTimeout(() => {
                                toggleDisabledAttribute('.address-overview .transaction-list a button', false);
                            }, args?.ending ? 0 : 1000);
                        }
                    };
                },
            },
            ui: {
                fadedElements: [
                    '.address-overview .mobile-action-bar',
                ],
                disabledElements: [
                    '.address-overview',
                ],
            },
        },
        [MobileOnboardingTourStep.BITCOIN_ADDRESS]: {
            path: '/',
            tooltip: {
                target: '.account-overview .bitcoin-account > .bitcoin-account-item > svg',
                content: [
                    'This is your Bitcoin wallet. You get one with every Nimiq account.',
                ],
                params: {
                    placement: 'top-start',
                },
            },
            ui: {
                fadedElements: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .mobile-action-bar',
                ],
                disabledElements: [
                    '.account-overview .bitcoin-account',
                ],
            },
        },
        [MobileOnboardingTourStep.WALLET_BALANCE]: {
            path: '/',
            tooltip: {
                target: '.account-overview .account-balance-container .amount',
                content: [
                    'Check the bar-chart to see how your addresses compose your total balance.',
                    'Currently you have 100% NIM, and no BTC.',
                ],
                params: {
                    placement: 'bottom',
                },
            },
            ui: {
                fadedElements: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-action-bar',
                ],
                disabledElements: [
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .bitcoin-account',
                ],
            },
        },
        [MobileOnboardingTourStep.RECOVERY_WORDS_ALERT]: {
            path: '/',
            tooltip: {
                target: '.account-overview .backup-warning button',
                content: [
                    'There is no \'forgot password\'.',
                    'Create a backup to make sure you stay in control.',
                ],
                params: {
                    placement: 'bottom',
                },
            },
            ui: {
                fadedElements: [
                    '.account-overview .mobile-action-bar',
                ],
                disabledElements: [
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .bitcoin-account',
                ],
            },
        },
        [MobileOnboardingTourStep.MENU_ICON]: {
            path: '/',
            tooltip: {
                target: '.account-overview .mobile-menu-bar > button.reset',
                content: [
                    'Tap on the menu icon to access your account and wallet settings.',
                ],
                params: {
                    placement: 'bottom-start',
                },
            },
            lifecycle: {
                mounted: async ({ goToNextStep }) => {
                    const hamburguerIcon = document
                        .querySelector('.account-overview .mobile-menu-bar > button.reset') as HTMLButtonElement;

                    hamburguerIcon!.addEventListener('click', () => goToNextStep(), { once: true, capture: true });
                },
            },
            ui: {
                fadedElements: [
                    '.account-overview .mobile-action-bar',
                ],
                disabledElements: [
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .bitcoin-account',
                ],
                isNextStepDisabled: true,
            },
        },
        [MobileOnboardingTourStep.ACCOUNT_OPTIONS]: {
            path: '/?sidebar=true',
            tooltip: {
                target: '.modal .small-page',
                content: [
                    'Create, switch and log out of accounts.',
                    'All security relevant actions can be found here too.',
                ],
                params: {
                    placement: 'top',
                },
            },
            ui: {
                disabledElements: [
                    '.column-sidebar',
                ],
            },
            lifecycle: {
                created: async () => {
                    await sleep(500);
                    const account = document.querySelector('.sidebar .account-menu') as HTMLButtonElement;
                    account.click();
                    await sleep(500); // TODO Check this random value
                },
                mounted: async () => {
                    const sidebar = (document.querySelector('.column-sidebar') as HTMLDivElement);
                    sidebar!.removeAttribute('data-non-interactable');
                    await root.$nextTick();

                    return async () => {
                        const closeBtn = (document.querySelector('.modal .close-button') as HTMLDivElement);
                        closeBtn.click();

                        await sleep(500); // TODO Check this random value
                    };
                },
            },
        },
        [MobileOnboardingTourStep.ONBOARDING_COMPLETED]: {
            path: '/?sidebar=true',
            tooltip: {
                target: '.column-sidebar .network .consensus-icon',
                content: [
                    'Wallet tour completed!',
                    'Nimiq is not just any crypto - Click on {WORLD} Network and discover true decentralization.',
                ],
                params: {
                    placement: 'top-start',
                },
                button: {
                    text: 'Go to Network',
                    fn: () => {
                        const { setTour } = useAccountStore();
                        setTour(null);
                        root.$router.push('/network');
                    },
                },
            },
            ui: {
                disabledElements: [
                    '.column-sidebar',
                ],
            },
        },
    };
    return steps;
}

function getNetworkTourSteps({ root }: SetupContext): TourSteps<NetworkTourStep> {
    return {
        [NetworkTourStep.TODO]: {
            path: '/network',
            tooltip: {
                target: '.network-overview .network-name',
                content: [
                    'Welcome to the {WORLD} Network!',
                    'This is the main network where all Nimiq transactions take place.',
                    'You can switch between networks by clicking on the {WORLD} Network icon in the top right corner.',
                ],
                params: {
                    placement: 'bottom',
                },
            },
            ui: {},
        },
    };
}

export function useTour(tour: TourName | null, context: SetupContext)
    : TourSteps<MobileOnboardingTourStep> | TourSteps<NetworkTourStep> | undefined {
    switch (tour) {
        case 'onboarding':
            return getOnboardingTourSteps(context);
        case 'network':
            return getNetworkTourSteps(context);
        default:
            return undefined;
    }
}
