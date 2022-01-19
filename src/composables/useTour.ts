import { Transaction, useTransactionsStore } from '@/stores/Transactions';
import { SetupContext } from '@vue/composition-api';
import { useAddressStore } from '../stores/Address';

type OnboardingTourPages = '/' | '/transactions' | '/?sidebar=true'

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

type NetworkTourPages = '/network'
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

export interface TourStep {
    page: OnboardingTourPages | NetworkTourPages;

    // data for the steps of v-tour
    tooltip: {
        target: string,
        content: string[],
        params: Readonly<{
            placement: BasePlacement | AlignedPlacement,
        }>,
    };

    lifecycle?: {
        prepareDOMPrevPage?: () => Promise<void>,
        prepareDOMNextPage?: () => Promise<void>,
        onBeforeMountedNextStep?: () => Promise<void>,
        onBeforeMountedPrevStep?: () => Promise<void>,
        onMountedStep?: (cbu: () => void) => void,
    };

    ui: {
        // Elements that must have opacity to focus attention in other elements in screen
        elementsWithOpacity?: string[], // array of selectors

        // Elements that shouldn't allow interactivity
        elementsWithoutInteractivity?: string[], // array of selectors

        disabledNextStep?: boolean,
    };
}

export type TourSteps = {
    [x in TourStepIndex]: TourStep;
};

// TODO Remove me
export function useFakeTx(): Transaction {
    return {
        transactionHash: '0x123',
        format: 'nim',
        timestamp: 1532739000,
        sender: useAddressStore().activeAddress.value || '',
        recipient: '0x123',
        senderType: 'nim',
        recipientType: 'nim',
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
export function useOnboardingTourSteps({ root }: SetupContext): TourSteps {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const closeAccountOptionsModal = async () => {
        const sidebar = (document.querySelector('.column-sidebar') as HTMLDivElement);
        sidebar!.removeAttribute('data-non-interactable');
        await root.$nextTick();

        const closeBtn = (document.querySelector('.modal .close-button') as HTMLDivElement);
        closeBtn.click();

        await sleep(400);
    };

    const openAccountOptionsModal = async () => {
        const account = document.querySelector('.sidebar .account-menu') as HTMLButtonElement;
        account.click();
        await sleep(500); // TODO Check this random value
    };

    const steps: TourSteps = {
        [MobileOnboardingTourStep.FIRST_ADDRESS]: {
            page: '/',
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
                onMountedStep: (cbu: () => void) => {
                    const addressButton = document.querySelector('.address-list > .address-button');

                    // eslint-disable-next-line no-unused-expressions
                    addressButton?.addEventListener('click', () => cbu(), { once: true });
                    // TODO Remove listener somehow if user clicks on the '>' button instead on the address item
                },
            },
            ui: {
                elementsWithOpacity: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .bitcoin-account',
                    '.account-overview .account-balance-container',
                    '.account-overview .mobile-action-bar',
                ],
            },
        },
        [MobileOnboardingTourStep.TRANSACTIONS_LIST]: {
            page: '/transactions',
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
            ui: {
                elementsWithOpacity: [
                    '.address-overview .mobile-action-bar',
                ],
                elementsWithoutInteractivity: [
                    '.address-overview .actions-mobile',
                    '.address-overview .active-address',
                ],
                disabledNextStep: true,
            },
        },
        [MobileOnboardingTourStep.FIRST_TRANSACTION]: {
            page: '/transactions',
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
                onMountedStep: () => {
                    const buyNimBtn = document
                        .querySelector('.address-overview .transaction-list a button') as HTMLButtonElement;
                    if (!buyNimBtn) return;
                    buyNimBtn.disabled = true;
                },
            },
            ui: {
                elementsWithOpacity: [
                    '.address-overview .mobile-action-bar',
                ],
                elementsWithoutInteractivity: [
                    '.address-overview',
                ],
            },
        },
        [MobileOnboardingTourStep.BITCOIN_ADDRESS]: {
            page: '/',
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
                elementsWithOpacity: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .mobile-action-bar',
                ],
                elementsWithoutInteractivity: [
                    '.account-overview .bitcoin-account',
                ],
            },
        },
        [MobileOnboardingTourStep.WALLET_BALANCE]: {
            page: '/',
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
                elementsWithOpacity: [
                    '.account-overview .backup-warning',
                    '.account-overview .mobile-action-bar',
                ],
                elementsWithoutInteractivity: [
                    '.account-overview .mobile-menu-bar',
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .bitcoin-account',
                ],
            },
        },
        [MobileOnboardingTourStep.RECOVERY_WORDS_ALERT]: {
            page: '/',
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
                elementsWithOpacity: [
                    '.account-overview .mobile-action-bar',
                ],
                elementsWithoutInteractivity: [
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .bitcoin-account',
                ],
            },
        },
        [MobileOnboardingTourStep.MENU_ICON]: {
            page: '/',
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
                onBeforeMountedNextStep: async () => {
                    await openAccountOptionsModal();
                },
                onMountedStep: (cbu: () => void) => {
                    const addressButton = document
                        .querySelector('.account-overview .mobile-menu-bar > button.reset');

                    // eslint-disable-next-line no-unused-expressions
                    addressButton?.addEventListener('click', () => cbu(), { once: true });
                },
            },
            ui: {
                elementsWithOpacity: [
                    '.account-overview .mobile-action-bar',
                ],
                elementsWithoutInteractivity: [
                    '.account-overview .account-balance-container',
                    '.account-overview .address-list',
                    '.account-overview .bitcoin-account',
                ],
                disabledNextStep: true,
            },
        },
        [MobileOnboardingTourStep.ACCOUNT_OPTIONS]: {
            page: '/?sidebar=true',
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
                elementsWithoutInteractivity: [
                    '.column-sidebar',
                ],
            },
            lifecycle: {
                prepareDOMPrevPage: async () => {
                    await closeAccountOptionsModal();

                    root.$router.push('/');
                    await sleep(500); // TODO Check this random value
                },
                prepareDOMNextPage: async () => {
                    await closeAccountOptionsModal();
                },
            },
        },
        [MobileOnboardingTourStep.ONBOARDING_COMPLETED]: {
            page: '/?sidebar=true',
            tooltip: {
                target: '.column-sidebar .network .consensus-icon',
                content: [
                    'Wallet tour completed!',
                    'Nimiq is not just any crypto - Click on {WORLD} Network and discover true decentralization.',
                ],
                params: {
                    placement: 'top-start',
                },
            },
            ui: {
                elementsWithoutInteractivity: [
                    '.column-sidebar',
                ],
            },
            lifecycle: {
                onBeforeMountedPrevStep: async () => {
                    await openAccountOptionsModal();
                },
            },
        },
    };
    steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].lifecycle = {
        ...steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].lifecycle,

        // TODO Maybe it could be possible without async/await
        onMountedStep: async () => new Promise((resolve) => {
            root.$watch(() => useTransactionsStore().state.transactions, (txs) => {
                if (Object.values(txs).length > 0) {
                    // Once the user has at least one transaction, tooltip in step TRANSACTIONS_LIST is modified
                    steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].tooltip = {
                        target: '.vue-recycle-scroller__item-wrapper',
                        content: ['This is where all your transactions will appear.'],
                        params: {
                            placement: 'bottom',
                        },
                    };
                    steps[MobileOnboardingTourStep.TRANSACTIONS_LIST].ui.disabledNextStep = false;
                }
                resolve();
            });
        }),
    };
    return steps;
}
