import { Route } from 'vue-router';
import HubApi, {
    type Account,
    type SignTransactionRequest,
    type SignStakingRequest,
    type SignBtcTransactionRequest,
    type SetupSwapRequest,
    type SetupSwapResult,
    type RefundSwapRequest,
    type SignPolygonTransactionRequest,
    type RequestType,
    type ResultByRequestType,
    type PopupRequestBehavior,
    type SignedPolygonTransaction,
    type SignedTransaction,
} from '@nimiq/hub-api';
import type { PlainTransactionDetails } from '@nimiq/core';
import type { RequestBehavior, BehaviorType } from '@nimiq/hub-api/dist/src/RequestBehavior.d';
import type { ForwardRequest } from '@opengsn/common/dist/EIP712/ForwardRequest';
import Config from 'config';
import { useAccountStore, AccountInfo, AccountType } from './stores/Account';
import { useAddressStore, AddressInfo, AddressType } from './stores/Address';
import { useBtcAddressStore, BtcAddressInfo } from './stores/BtcAddress';
import { useTransactionsStore } from './stores/Transactions';
import { useBtcTransactionsStore } from './stores/BtcTransactions';
import { PolygonAddressInfo, usePolygonAddressStore } from './stores/PolygonAddress';
import { useProxyStore, Cashlink } from './stores/Proxy';
import { useConfig } from './composables/useConfig';
import { sendTransaction as sendTx } from './network';
import { sendTransaction as sendBtcTx } from './electrum';
import { createTransactionRequest, sendTransaction as sendPolygonTx } from './ethers';
import { isProxyData, ProxyTransactionDirection } from './lib/ProxyDetection';
import router, { RouteName } from './router';
import { useSettingsStore } from './stores/Settings';
import { useFiatStore } from './stores/Fiat';
import { useKycStore } from './stores/Kyc';
import { WELCOME_MODAL_LOCALSTORAGE_KEY, WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY } from './lib/Constants';
import { usePwaInstallPrompt } from './composables/usePwaInstallPrompt';
import type { SetupSwapWithKycResult, SWAP_KYC_HANDLER_STORAGE_KEY } from './swap-kyc-handler'; // avoid bundling
import type { RelayServerInfo } from './lib/usdc/OpenGSN';

export function shouldUseRedirects(ignoreSettings = false): boolean {
    if (!ignoreSettings) {
        const { hubBehavior } = useSettingsStore();
        if (hubBehavior.value === 'redirect') return true;
        if (hubBehavior.value !== 'auto') return false;
    }

    const { canInstallPwa } = usePwaInstallPrompt();
    // When not in PWA (which we are if PWA can be installed), don't use redirects
    if (canInstallPwa.value) return false;

    // Use redirect in Samsung Browser PWA, because hub popups opened from the PWA don't get the request ("invalid
    // request" error), while popups opened from the regular Samsung Browser work fine.
    if (navigator.userAgent.includes('SamsungBrowser')) return true;

    // Firefox does not reliably provide the beforeinstallprompt event, preventing detection of PWA installed status
    // // Firefox Mobile
    // if (navigator.userAgent.includes('Firefox') && navigator.userAgent.includes('Android')) return true;

    return false;
}

function getBehavior({
    abortSignal, // Only for popups because Wallet can not abort a redirect request as it's not open after redirect.
    localState, // Only for redirects. For popups no state needs to be stored as the Wallet remains open.
}: {
    abortSignal?: AbortSignal,
    localState?: any,
} = {}): RequestBehavior<BehaviorType.REDIRECT | BehaviorType.POPUP> | undefined {
    if (shouldUseRedirects()) {
        return new HubApi.RedirectRequestBehavior(window.location.href, localState);
    }

    // @ts-expect-error _defaultBehavior is private.
    const defaultBehavior: PopupRequestBehavior = hubApi._defaultBehavior;

    if (abortSignal) {
        // Return a popup behavior that can be aborted.
        return new class AbortablePopupRequestBehavior extends HubApi.PopupRequestBehavior {
            constructor(private abortSignal: AbortSignal) { // eslint-disable-line @typescript-eslint/no-shadow
                // Create with same parameters as defaultBehavior
                // @ts-expect-error _popupFeatures and _options are private
                super(defaultBehavior._popupFeatures, defaultBehavior._options);
                abortSignal.addEventListener('abort', () => {
                    // @ts-expect-error shouldRetryRequest is private
                    this.shouldRetryRequest = false;
                    // @ts-expect-error popup and client are private
                    const { popup, client } = this;
                    if (popup) popup.close();
                    if (client) client.close();
                });
            }

            override async request<R extends RequestType>(
                endpoint: string,
                command: R,
                args: Iterable<PromiseLike<any> | any>,
            ): Promise<ResultByRequestType<R>> {
                if (this.abortSignal.aborted) throw new Error('Connection was closed'); // same error as on closed popup
                return super.request(endpoint, command, args);
            }

            override createPopup(url: string) {
                if (this.abortSignal.aborted) throw new Error('Failed to open popup'); // same error as on failed popup
                return super.createPopup(url);
            }
        }(abortSignal);
    }

    // Return defaultBehavior which is a PopupRequestBehavior.
    return defaultBehavior;
}

// We can't use the reactive config via useConfig() here because that one can only be used after the composition-api
// plugin has been registered in Vue 2.
const hubApi = new HubApi(Config.hubEndpoint);

hubApi.on(HubApi.RequestType.ONBOARD, async (accounts) => {
    const { config } = useConfig();

    // Store the returned account(s). Also enriches the added accounts with btc addresses already known to wallet.
    // For first-time signups on iOS/Safari, this is the only time that we receive the BTC addresses (as they are not
    // listed in the Hub iframe cookie).
    processAndStoreAccounts(accounts);

    // Open optional Welcome modal, Bitcoin activation modal or USDC activation modal if appropriate.
    await new Promise<void>((resolve) => { router.onReady(resolve); });
    if (!areOptionalRedirectsAllowed(router.currentRoute)) return;
    const welcomeModalAlreadyShown = window.localStorage.getItem(WELCOME_MODAL_LOCALSTORAGE_KEY);
    const { requestType } = accounts[0];

    switch (requestType) {
        case HubApi.RequestType.SIGNUP:
            // Signup of a Keyguard account
            if (!welcomeModalAlreadyShown && config.enableBitcoin && config.polygon.enabled) {
                // Show regular first-time welcome flow which talks about Bitcoin and USDC.
                router.push({ name: RouteName.Welcome });
            }
            break;
        case HubApi.RequestType.LOGIN:
            // Login of a Keyguard or Ledger account
            if (accounts[0].type !== AccountType.LEGACY && !accounts[0].btcAddresses?.external.length
                && config.enableBitcoin) {
                // After adding an account that supports Bitcoin without it being activated yet (this is the case for
                // Ledger logins where Bitcoin is not automatically activated as it requires the Bitcoin app; for
                // Keyguard accounts it's automatically activated on login), offer to activate it. After activation, the
                // Bitcoin activation modal leads into the Welcome modal if not shown yet.
                router.push({ name: RouteName.BtcActivation });
            }
            // We currently don't need to handle the case that USDC is not activated yet after logins, because for
            // Legacy and Ledger accounts it's currently not supported yet, and for Keyguard accounts it's automatically
            // activated on login.
            break;
        // We don't need to do Bitcoin/USDC activation checks for RequestType.Onboard, which happens when in Safari the
        // Hub reported no accounts from the cookie, but still had accounts in the database, which could be accessed and
        // returned in the ONBOARD redirect and directly returned. We simply treat this as the accounts not having been
        // lost, i.e. run the regular USDC activation check in syncFromHub (which happens at a later point) and the
        // Bitcoin activation check only after actual new logins.
        default: break;
    }
});

hubApi.on(HubApi.RequestType.MIGRATE, () => {
    router.onReady(() => router.push({ name: RouteName.MigrationWelcome }));
});

hubApi.on(HubApi.RequestType.SIGN_TRANSACTION, async (tx) => {
    // TODO: Show status notification
    await sendTx(tx);
});

hubApi.on(HubApi.RequestType.SIGN_BTC_TRANSACTION, async (tx) => {
    // TODO: Show status notification
    await sendBtcTx(tx);
});

hubApi.on(HubApi.RequestType.CREATE_CASHLINK, (cashlink) => {
    const proxyStore = useProxyStore();
    // TODO: Show status notification
    proxyStore.addHubCashlink(cashlink);
});

hubApi.on(HubApi.RequestType.MANAGE_CASHLINK, (cashlink) => {
    const proxyStore = useProxyStore();
    proxyStore.addHubCashlink(cashlink);
});

hubApi.on(HubApi.RequestType.SETUP_SWAP, (swapResult) => {
    // TODO: Start swap process
    console.log({ swapResult }); // eslint-disable-line no-console
});

export async function initHubApi() {
    return hubApi.checkRedirectResponse();
}

const APP_NAME = 'Wallet';

function onError(error: 'Connection was closed' | Error) {
    if (
        error === 'Connection was closed'
        || error.message === 'Connection was closed' // Popup closed
        || error.message === 'Request aborted' // Reject-on-back
        || error.message === 'CANCELED' // Cancelled by user action
    ) {
        return null;
    }

    // TODO: Show user notification?
    throw error;
}

function processAndStoreAccounts(accounts: Account[], replaceState = false): void {
    const accountInfos: AccountInfo[] = [];
    const addressInfos: AddressInfo[] = [];
    const btcAddressInfos: BtcAddressInfo[] = [];
    const polygonAddressInfos: PolygonAddressInfo[] = [];

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();
    const btcAddressStore = useBtcAddressStore();
    const polygonAddressStore = usePolygonAddressStore();

    for (const account of accounts) {
        const addresses: string[] = [];

        for (const address of account.addresses) {
            addresses.push(address.address);

            addressInfos.push({
                address: address.address,
                type: AddressType.BASIC,
                label: address.label,
                balance: addressStore.state.addressInfos[address.address]?.balance ?? null,
            });
        }

        // For vesting contract testing
        // FIXME: Remove when done.
        if (account.accountId === 'c32d372d98b0') {
            account.contracts.push({
                address: 'NQ17 9A8N TXK7 S4KC CRJP Q46Q VPY7 32KL QPYD',
                label: 'Vesting Contract',
                type: AddressType.VESTING as number,
                owner: 'NQ26 8MMT 8317 VD0D NNKE 3NVA GBVE UY1E 9YDF',
                startTime: 1e3,
                stepAmount: 50000e5,
                timeStep: 800000e3,
                totalAmount: 100000e5,
            });
        }

        for (const contract of account.contracts) {
            addresses.push(contract.address);

            addressInfos.push({
                ...contract,
                balance: addressStore.state.addressInfos[contract.address]?.balance ?? null,
                type: contract.type as number,
            });
        }

        for (const chain of ['internal', 'external'] as Array<'internal' | 'external'>) {
            for (const btcAddress of account.btcAddresses[chain]) {
                const existingAddressInfo: BtcAddressInfo | Record<string, never> = btcAddressStore
                    .state.addressInfos[btcAddress] || {};

                btcAddressInfos.push({
                    address: btcAddress,
                    txoCount: existingAddressInfo.txoCount || 0,
                    utxos: existingAddressInfo.utxos || [],
                });
            }
        }

        // Check if we know more BTC addresses in the Wallet than the Hub
        const existingAccount = accountStore.state.accountInfos[account.accountId];
        if (existingAccount && existingAccount.btcAddresses) {
            account.btcAddresses = {
                internal: existingAccount.btcAddresses.internal.length > account.btcAddresses.internal.length
                    ? existingAccount.btcAddresses.internal
                    : account.btcAddresses.internal,
                external: existingAccount.btcAddresses.external.length > account.btcAddresses.external.length
                    ? existingAccount.btcAddresses.external
                    : account.btcAddresses.external,
            };
        }

        for (const polygonAddress of account.polygonAddresses) {
            polygonAddressInfos.push({
                address: polygonAddress,
                balanceUsdcBridged: polygonAddressStore.state.addressInfos[polygonAddress]?.balanceUsdcBridged ?? null,
                balanceUsdc: polygonAddressStore.state.addressInfos[polygonAddress]?.balanceUsdc ?? null,
                balanceUsdtBridged: polygonAddressStore.state.addressInfos[polygonAddress]?.balanceUsdtBridged ?? null,
                pol: polygonAddressStore.state.addressInfos[polygonAddress]?.pol ?? null,
            });
        }

        accountInfos.push({
            id: account.accountId,
            type: account.type,
            label: account.label,
            fileExported: account.fileExported,
            wordsExported: account.wordsExported,
            addresses,
            btcAddresses: { ...account.btcAddresses },
            polygonAddresses: [...account.polygonAddresses],
            uid: account.uid || existingAccount?.uid,
        });
    }

    // On iOS & Safari we cannot update the list of derived Bitcoin addresses in the Hub, when
    // deriving new addresses via the iframe. We therefore cannot simply overwrite all stored
    // Bitcoin address infos in the Wallet, as that would likely delete previously additional
    // derived ones.
    if (btcAddressInfos.length) {
        btcAddressStore.addAddressInfos(btcAddressInfos);
    }

    if (replaceState) {
        addressStore.setAddressInfos(addressInfos);
        polygonAddressStore.setAddressInfos(polygonAddressInfos);
        // Accounts set last, so all their address infos exist already
        accountStore.setAccountInfos(accountInfos);
    } else {
        for (const addressInfo of addressInfos) {
            addressStore.addAddressInfo(addressInfo);
        }
        for (const polygonAddressInfo of polygonAddressInfos) {
            polygonAddressStore.addAddressInfo(polygonAddressInfo);
        }
        // Accounts set last, so all their address infos exist already
        for (const accountInfo of accountInfos) {
            accountStore.addAccountInfo(accountInfo);
        }
    }
}

function areOptionalRedirectsAllowed(currentRoute: Route) {
    // Do not perform optional redirects if we're on any other modal or page already, other than the root page or the
    // account menu open on root. Notably, don't intercept payment flows by payment request links and do not open modals
    // while on /network or /settings because the optional modals we're opening here live on root as parent page (which
    // we could navigate to first of course, but here prefer not to; also see Sidebar.vue for further explanation).
    return currentRoute.name && /^root(?:-accounts)?$/.test(currentRoute.name);
}

export async function syncFromHub() {
    const { config } = useConfig();

    let listedAccounts: Account[];
    let listedCashlinks: Cashlink[] = [];
    try {
        // Cannot trigger both requests at the same time with Promise.all,
        // because the first call triggers a HubApi-internal init() call,
        // which is not resolved when the second call is done at the same time,
        // throwing a "Must call init() first" error (which then fails both requests).
        listedAccounts = await hubApi.list();
        listedCashlinks = await hubApi.cashlinks();
    } catch (error: any) {
        if (error.message === 'MIGRATION_REQUIRED') {
            const behavior = new HubApi.RedirectRequestBehavior() as RequestBehavior<BehaviorType.REDIRECT>;
            hubApi.migrate(behavior);
            return;
        }

        // TODO: Handle this case with a user notification
        if (error.message === 'ACCOUNTS_LOST') listedAccounts = [];

        // TODO: Handle error
        else throw error;
    }

    if (!listedAccounts.length) {
        onboard(true);
        return;
    }

    processAndStoreAccounts(listedAccounts, true);

    if (listedCashlinks.length) {
        const proxyStore = useProxyStore();
        proxyStore.setHubCashlinks(listedCashlinks);
    }

    // Offer optional USDC activation if it's not activated yet. Currently, we do this in syncFromHub on every app start
    // which is fine for Keyguard accounts for which it only needs to be activated once per account created before the
    // USDC release and not for accounts created or logged in after that. Once we have USDC support for Ledgers, this
    // check should become less aggressive and be done in onboard only (same as the Bitcoin activation check) because
    // for Ledgers USDC would not be enabled automatically on logins and the activation reminder on every app start
    // would be annoying for the user.
    const { activeAccountInfo } = useAccountStore();
    await new Promise<void>((resolve) => { router.onReady(resolve); });
    if (
        areOptionalRedirectsAllowed(router.currentRoute)
        && activeAccountInfo.value?.type === AccountType.BIP39 // Legacy accounts and Ledgers are not supported.
        && !activeAccountInfo.value.polygonAddresses?.length
        && config.polygon.enabled
    ) {
        // Prompt for USDC activation, which then leads into the new welcome modal if not shown yet.
        router.push({ name: RouteName.UsdcActivation });
    } else {
        // Check if the WelcomeStakingModal should be shown
        const welcomeStakingModalAlreadyShown = window.localStorage.getItem(
            WELCOME_STAKING_MODAL_LOCALSTORAGE_KEY,
        );

        if (!welcomeStakingModalAlreadyShown) {
            // Show WelcomeStakingModal if not shown before
            router.push({ name: RouteName.WelcomeStaking });
        }
    }
}

export async function onboard(asRedirect = false) {
    const { config } = useConfig();

    if (asRedirect) {
        const behavior = new HubApi.RedirectRequestBehavior(window.location.href);
        hubApi.onboard({
            appName: APP_NAME,
            disableBack: true,
        }, behavior as RequestBehavior<BehaviorType.REDIRECT>);
        return null;
    }

    const accounts = await hubApi.onboard({ appName: APP_NAME }, getBehavior()).catch(onError);
    if (!accounts) return false;

    processAndStoreAccounts(accounts); // also enriches the added accounts with btc addresses already known to wallet

    // After adding an account that supports Bitcoin without it being activated yet (this is the case for Ledger logins
    // where Bitcoin is not automatically activated as it requires the Bitcoin app; for Keyguard accounts it's activated
    // automatically on login), optionally offer to activate it. After activation, the Bitcoin activation modal leads
    // into the Welcome modal if not shown yet.
    const { activeAccountInfo } = useAccountStore();
    await new Promise<void>((resolve) => { router.onReady(resolve); });
    if (
        areOptionalRedirectsAllowed(router.currentRoute)
        && activeAccountInfo.value
        && activeAccountInfo.value.type !== AccountType.LEGACY // Legacy accounts are not supported.
        && !activeAccountInfo.value.btcAddresses?.external.length
        && config.enableBitcoin
    ) {
        router.push({ name: RouteName.BtcActivation });
    }
    return true;
}

export async function addAddress(accountId: string) {
    const addedAddress = await hubApi.addAddress({
        appName: APP_NAME,
        accountId,
    }, getBehavior()).catch(onError);
    if (!addedAddress) return false;

    const addressInfo: AddressInfo = {
        address: addedAddress.address,
        type: AddressType.BASIC,
        label: addedAddress.label,
        balance: null,
    };

    const addressStore = useAddressStore();
    // Adding an AddressInfo automatically subscribes the address in the network
    addressStore.addAddressInfo(addressInfo, /* selectIt */ true);

    const accountStore = useAccountStore();
    accountStore.addAddressToAccount(accountId, addressInfo.address);

    return true;
}

export async function backup(accountId: string, options: { wordsOnly?: boolean, fileOnly?: boolean }) {
    const exportResult = await hubApi.export({
        appName: APP_NAME,
        accountId,
        ...options,
    }, getBehavior()).catch(onError);
    if (!exportResult) return false;

    const accountStore = useAccountStore();
    accountStore.patchAccount(accountId, exportResult);

    return true;
}

export async function sendTransaction(request: Omit<SignTransactionRequest, 'appName'>, abortSignal?: AbortSignal) {
    const signedTransaction = await hubApi.signTransaction({
        appName: APP_NAME,
        ...request,
    }, getBehavior({ abortSignal })).catch(onError);
    if (!signedTransaction) return null;

    return sendTx(signedTransaction);
}

export async function sendStaking(request: Omit<SignStakingRequest, 'appName'>) {
    const signedTransactions = await hubApi.signStaking({
        appName: APP_NAME,
        ...request,
    }).catch(onError);
    if (!signedTransactions) return null;

    const txDetails: PlainTransactionDetails[] = [];

    if (Array.isArray(signedTransactions)) {
        for (const signedTx of signedTransactions) {
            // Need to await here, to be sure the transactions are sent after each other
            const details = await sendTx(signedTx); // eslint-disable-line no-await-in-loop
            txDetails.push(details);
            if (details.executionResult === false) break;
        }
    } else { // Backward-compatibility
        txDetails.push(await sendTx(signedTransactions as SignedTransaction));
    }

    return txDetails;
}

export async function signStakingRaw(request: Omit<SignStakingRequest, 'appName'>)
    : Promise<SignedTransaction | SignedTransaction[] | null> {
    try {
        const requestShape = Array.isArray((request as any).transaction) ? 'array' : 'single';
        const txLen = Array.isArray((request as any).transaction)
            ? (request as any).transaction.length
            : ((request as any).transaction || '').length;
        // eslint-disable-next-line no-console
        console.debug('signStakingRaw: request', { requestShape, txLen });

        const signedTransactions = await hubApi.signStaking({
            appName: APP_NAME,
            ...request,
        });

        if (!signedTransactions) {
            // eslint-disable-next-line no-console
            console.debug('signStakingRaw: no result (null)');
            return null;
        }

        const resultShape = Array.isArray(signedTransactions) ? 'array' : 'single';
        const resultCount = Array.isArray(signedTransactions) ? signedTransactions.length : 1;
        // eslint-disable-next-line no-console
        console.debug('signStakingRaw: result', { resultShape, resultCount });
        return signedTransactions as SignedTransaction | SignedTransaction[];
    } catch (error: any) {
        // eslint-disable-next-line no-console
        console.error('signStakingRaw: error', { message: error?.message });
        const handled = onError(error);
        if (handled === null) return null;
        throw error;
    }
}

export async function unstakeFlow(request: any): Promise<any> {
    try {
        const result = await hubApi.unstakeFlow({
            appName: APP_NAME,
            ...request,
        });
        return result as any;
    } catch (error: any) {
        const handled = onError(error);
        if (handled === null) return null;
        throw error;
    }
}

export async function createCashlink(senderAddress: string, senderBalance?: number) {
    const cashlink = await hubApi.createCashlink({
        appName: APP_NAME,
        senderAddress,
        senderBalance,
        fiatCurrency: useFiatStore().state.currency,
    }, getBehavior()).catch(onError);
    if (!cashlink) return false;

    // Handle cashlink
    const proxyStore = useProxyStore();
    proxyStore.addHubCashlink(cashlink);

    return true;
}

export async function manageCashlink(cashlinkAddress: string) {
    const cashlink = await hubApi.manageCashlink({
        appName: APP_NAME,
        cashlinkAddress,
    }, getBehavior()).catch(onError).catch((error: null | Error) => {
        if (!error) return null;
        if (error.message.startsWith('Could not find Cashlink for address')) {
            return {
                address: cashlinkAddress,
                message: '',
                value: 0, // To signal this cashlink is not stored in the Hub
            };
        }
        throw error;
    });
    if (!cashlink) return false;

    // Handle cashlink
    const proxyStore = useProxyStore();
    proxyStore.addHubCashlink(cashlink);

    return true;
}

export async function rename(accountId: string, address?: string) {
    const account = await hubApi.rename({
        appName: APP_NAME,
        accountId,
        address,
    }, getBehavior()).catch(onError);
    if (!account) return false;

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();

    accountStore.patchAccount(accountId, { label: account.label });
    for (const info of account.addresses.concat(account.contracts)) {
        addressStore.patchAddress(info.address, { label: info.label });
    }

    return true;
}

export async function addVestingContract() {
    const account = await hubApi.addVestingContract({
        appName: APP_NAME,
    }, getBehavior()).catch(onError);
    if (!account) return false;

    processAndStoreAccounts([account]);

    return true;
}

export async function changePassword(accountId: string) {
    await hubApi.changePassword({
        appName: APP_NAME,
        accountId,
    }, getBehavior()).catch(onError);
}

export async function logout(accountId: string) {
    const loggedOut = await hubApi.logout({
        appName: APP_NAME,
        accountId,
    }, getBehavior()).catch(onError);
    if (!loggedOut) return false;

    if (!loggedOut.success) return false;

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();
    const transactionStore = useTransactionsStore();
    const proxyStore = useProxyStore();
    const btcAddressStore = useBtcAddressStore();
    const btcTransactionStore = useBtcTransactionsStore();

    const addressesToDelete = accountStore.state.accountInfos[accountId].addresses;

    const remainingAddresses = Object.values(addressStore.state.addressInfos)
        .map((addressInfo) => addressInfo.address)
        .filter((address) => !addressesToDelete.includes(address));

    let transactionsToDelete = Object.values(transactionStore.state.transactions)
        .filter((tx) => !remainingAddresses.includes(tx.sender) && !remainingAddresses.includes(tx.recipient));

    const transactionsToDeleteHashes = transactionsToDelete
        .map((tx) => tx.transactionHash);

    const remainingTransactions = Object.values(transactionStore.state.transactions)
        .filter((tx) => !transactionsToDeleteHashes.includes(tx.transactionHash));

    const remainingTransactionRelatedTransactionHashes = remainingTransactions
        .map((tx) => tx.relatedTransactionHash)
        .filter((hash) => Boolean(hash));

    // Keep the transactions that are still referenced by remaining transactions' relatedTransactionHash
    transactionsToDelete = transactionsToDelete
        .filter((tx) => !remainingTransactionRelatedTransactionHashes.includes(tx.transactionHash));

    const pendingProxiesToDelete = transactionsToDelete
        .map((tx) => {
            // Note: proxy transactions from or to our addresses always hold the proxy data. Currently only swap proxy
            // htlc creation transactions hold the htlc data instead
            if (isProxyData(tx.data.raw, undefined, ProxyTransactionDirection.FUND)) return tx.recipient;
            if (isProxyData(tx.data.raw, undefined, ProxyTransactionDirection.REDEEM)) return tx.sender;
            return '';
        })
        .filter((address) => !!address);

    /**
     * Bitcoin
     */
    const btcAddressesToDelete = accountStore.state.accountInfos[accountId].btcAddresses.internal
        .concat(accountStore.state.accountInfos[accountId].btcAddresses.external);

    const remainingBtcAddresses = Object.values(btcAddressStore.state.addressInfos)
        .map((addressInfo) => addressInfo.address)
        .filter((address) => !btcAddressesToDelete.includes(address));

    const btcTransactionsToDelete = Object.values(btcTransactionStore.state.transactions)
        .filter((tx) => {
            for (const address of tx.addresses) {
                if (remainingBtcAddresses.includes(address)) return false;
            }
            return true;
        });

    // Delete account, it's addresses, their transactions and cashlinks
    for (const cashlinkAddress of pendingProxiesToDelete) {
        proxyStore.removeProxy(cashlinkAddress);
    }
    transactionStore.removeTransactions(transactionsToDelete);
    addressStore.removeAddresses(addressesToDelete);
    btcTransactionStore.removeTransactions(btcTransactionsToDelete);
    btcAddressStore.removeAddresses(btcAddressesToDelete);
    accountStore.removeAccount(accountId);

    if (!Object.values(accountStore.state.accountInfos).length) {
        onboard(true);
        return null;
    }

    return true;
}

export async function sendBtcTransaction(
    tx: Omit<SignBtcTransactionRequest, 'appName'> | Promise<Omit<SignBtcTransactionRequest, 'appName'>>,
) {
    const signedTransaction = await hubApi.signBtcTransaction(
        Promise.resolve(tx).then((tx2) => ({
            appName: APP_NAME,
            ...tx2,
        })),
        getBehavior(),
    ).catch(onError);
    if (!signedTransaction) return null;

    return sendBtcTx(signedTransaction);
}

export async function activateBitcoin(accountId: string) {
    const account = await hubApi.activateBitcoin({
        appName: APP_NAME,
        accountId,
    }, getBehavior()).catch(onError);
    if (!account) return false;

    processAndStoreAccounts([account]);

    return true;
}

export async function activatePolygon(accountId: string) {
    const account = await hubApi.activatePolygon({
        appName: APP_NAME,
        accountId,
    }, getBehavior()).catch(onError);
    if (!account) return false;

    processAndStoreAccounts([account]);

    return true;
}

export async function sendPolygonTransaction(
    tokenAddress: string,
    recipient: string,
    amount: number,
    recipientLabel?: string,
    forceRelay?: RelayServerInfo,
) {
    // eslint-disable-next-line no-async-promise-executor

    let relayUrl: string;

    // eslint-disable-next-line no-async-promise-executor
    const request = new Promise<SignPolygonTransactionRequest>(async (resolve, reject) => {
        try {
            const {
                relayRequest,
                permit,
                approval,
                relay,
            } = await createTransactionRequest(tokenAddress, recipient, amount, forceRelay);
            relayUrl = relay.url;
            resolve({
                ...relayRequest,
                appName: APP_NAME,
                recipientLabel,

                ...(permit ? {
                    permit: {
                        tokenNonce: permit.tokenNonce,
                    },
                } : null),

                ...(approval ? {
                    approval: {
                        tokenNonce: approval.tokenNonce,
                    },
                } : null),
            });
        } catch (e) {
            reject(e);
        }
    });
    const signedTransaction = await hubApi.signPolygonTransaction(request, getBehavior()).catch(onError);
    if (!signedTransaction) return false;

    const { relayData, ...relayRequest } = signedTransaction.message;
    return sendPolygonTx(
        tokenAddress,
        { request: relayRequest as ForwardRequest, relayData },
        signedTransaction.signature,
        relayUrl!,
    );
}

export async function addBtcAddresses(accountId: string, chain: 'internal' | 'external', count?: number) {
    const accountStore = useAccountStore();
    const accountInfo = accountStore.state.accountInfos[accountId];

    const existingAddresses = accountInfo.btcAddresses[chain];

    const result = await hubApi.addBtcAddresses({
        appName: APP_NAME,
        accountId,
        chain,
        firstIndex: existingAddresses.length - 1, // Fetch one earlier to compare to the last known one
    });

    if (existingAddresses[existingAddresses.length - 1] !== result.addresses[0]) {
        throw new Error(
            `UNEXPECTED: BTC address at end of list does not match derived address at its index (${chain} chain)`,
        );
    }

    const newAddresses = result.addresses.slice(1, count ? count + 1 : undefined);

    const btcAddressInfos: BtcAddressInfo[] = newAddresses.map((address) => ({
        address,
        txoCount: 0,
        utxos: [],
    }));

    // Add address infos first
    const btcAddressStore = useBtcAddressStore();
    btcAddressStore.addAddressInfos(btcAddressInfos);

    // Add raw addresses to account's address list to recalculate the BTC address set
    accountStore.patchAccount(accountId, {
        btcAddresses: {
            ...accountInfo.btcAddresses,
            [chain]: [
                ...accountInfo.btcAddresses[chain],
                ...newAddresses,
            ],
        },
    });

    return btcAddressInfos;
}

export async function setupSwap(requestPromise: Promise<Omit<SetupSwapRequest, 'appName' | 'kyc'>>)
    : Promise<SetupSwapResult | SetupSwapWithKycResult | null | /* for redirect requests */ void> {
    const { connectedUser: { value: kycUser } } = useKycStore();
    const requestWithAppNamePromise = requestPromise.then((request) => ({
        ...request,
        appName: APP_NAME,
    }));
    if (kycUser) {
        // Use special flow that handles TEN31 Pass and Hub in one single popup via redirects. It uses the same request
        // and result types as the Hub's regular setupSwap call, just extended by a kyc entry. To imitate the same
        // behavior as for a regular Hub call, including the Hub overlay, we use the Hub's RequestBehaviors.

        // For the case that the wallet is configured to use redirects, clear the swap kyc handler storage. Only using
        // types imported from swap kyc handler and no code or constants to avoid bundling of the swap kyc handler into
        // the common bundle.
        const SWAP_KYC_HANDLER_STORAGE_KEY: SWAP_KYC_HANDLER_STORAGE_KEY = 'wallet-swap-kyc-handler';
        window.sessionStorage.removeItem(SWAP_KYC_HANDLER_STORAGE_KEY);

        const requestBehavior = getBehavior()
            // @ts-expect-error: _defaultBehavior is private
            || hubApi._defaultBehavior;
        return requestBehavior.request(
            `${window.location.origin}/swap-kyc-handler`,
            HubApi.RequestType.SETUP_SWAP,
            [requestWithAppNamePromise, kycUser],
        ).catch(onError);
    }
    return hubApi.setupSwap(requestWithAppNamePromise, getBehavior()).catch(onError);
}

export async function swapBridgedUsdcToNative(requestPromise: Promise<Omit<SignPolygonTransactionRequest, 'appName'>>)
    : Promise<SignedPolygonTransaction | null | void> {
    const requestWithAppNamePromise = requestPromise.then((request) => ({
        ...request,
        appName: APP_NAME,
    }));
    return hubApi.signPolygonTransaction(requestWithAppNamePromise, getBehavior()).catch(onError);
}

export async function refundSwap(requestPromise: Promise<Omit<RefundSwapRequest, 'appName'>>) {
    return hubApi.refundSwap(
        requestPromise.then((request) => ({ ...request, appName: APP_NAME })),
        getBehavior(),
    ).catch(onError);
}

export async function signPolygonTransaction(requestPromise: Promise<Omit<SignPolygonTransactionRequest, 'appName'>>) {
    return hubApi.signPolygonTransaction(
        requestPromise.then((request) => ({ ...request, appName: APP_NAME })),
        getBehavior(),
    ).catch(onError);
}
