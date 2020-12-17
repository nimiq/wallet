import HubApi, {
    Account,
    SignTransactionRequest,
    SignBtcTransactionRequest,
    SetupSwapRequest,
    RefundSwapRequest,
} from '@nimiq/hub-api';
import { RequestBehavior, BehaviorType } from '@nimiq/hub-api/dist/src/client/RequestBehavior.d';
import Config from 'config';
import { useAccountStore, AccountInfo } from './stores/Account';
import { useAddressStore, AddressInfo, AddressType } from './stores/Address';
import { useBtcAddressStore, BtcAddressInfo } from './stores/BtcAddress';
import { useTransactionsStore } from './stores/Transactions';
import { useBtcTransactionsStore } from './stores/BtcTransactions';
import { useProxyStore, Cashlink } from './stores/Proxy';
import { sendTransaction as sendTx } from './network';
import { sendTransaction as sendBtcTx } from './electrum';
import { isProxyData, ProxyTransactionDirection } from './lib/ProxyDetection';
import router from './router';

const hubApi = new HubApi(Config.hubEndpoint);

let welcomeRoute = '';

hubApi.on(HubApi.RequestType.ONBOARD, (accounts) => {
    // Store the returned account(s). For first-time signups on iOS/Safari, this is the only time
    // that we receive the BTC addresses (as they are not listed in the Hub iframe cookie).
    processAndStoreAccounts(accounts);

    const accountStore = useAccountStore();

    if (Object.keys(accountStore.state.accountInfos).length === 1) {
        welcomeRoute = '/welcome';
    } else if (accounts[0].btcAddresses && accounts[0].btcAddresses.external.length > 0) {
        welcomeRoute = '/btc-activation/activated';
    }
});

hubApi.on(HubApi.RequestType.MIGRATE, () => {
    welcomeRoute = '/migration-welcome';
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

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();
    const btcAddressStore = useBtcAddressStore();

    for (const account of accounts) {
        const addresses: string[] = [];

        for (const address of account.addresses) {
            addresses.push(address.address);

            const balance = addressStore.state.addressInfos[address.address]?.balance;

            addressInfos.push({
                address: address.address,
                type: AddressType.BASIC,
                label: address.label,
                balance: balance || (balance === 0 ? 0 : null),
            });
        }

        // For vesting contract testing
        // FIXME: Remove when done.
        if (account.accountId === 'c32d372d98b0') {
            account.contracts.push({
                address: 'NQ17 9A8N TXK7 S4KC CRJP Q46Q VPY7 32KL QPYD',
                label: 'Vesting Contract',
                type: AddressType.VESTING,
                owner: 'NQ26 8MMT 8317 VD0D NNKE 3NVA GBVE UY1E 9YDF',
                start: 1,
                stepAmount: 50000e5,
                stepBlocks: 800000,
                totalAmount: 100000e5,
            });
        }

        for (const contract of account.contracts) {
            addresses.push(contract.address);

            addressInfos.push({
                ...contract,
                balance: addressStore.state.addressInfos[contract.address]?.balance || null,
            });
        }

        for (const chain of ['internal', 'external'] as Array<'internal' | 'external'>) {
            for (const btcAddress of account.btcAddresses[chain]) {
                const existingAddressInfo: BtcAddressInfo | Record<string, never> = btcAddressStore
                    .state.addressInfos[btcAddress] || {};

                btcAddressInfos.push({
                    address: btcAddress,
                    used: existingAddressInfo.used || false,
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

        accountInfos.push({
            id: account.accountId,
            // @ts-expect-error Type 'WalletType' is not assignable to type 'AccountType'. (WalletType is not exported.)
            type: account.type,
            label: account.label,
            fileExported: account.fileExported,
            wordsExported: account.wordsExported,
            addresses,
            btcAddresses: { ...account.btcAddresses },
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
        accountStore.setAccountInfos(accountInfos);
    } else {
        for (const addressInfo of addressInfos) {
            addressStore.addAddressInfo(addressInfo);
        }
        for (const accountInfo of accountInfos) {
            accountStore.addAccountInfo(accountInfo);
        }
    }
}

export async function syncFromHub() {
    let listedAccounts: Account[];
    let listedCashlinks: Cashlink[] = [];
    try {
        // Cannot trigger both requests at the same time with Promise.all,
        // because the first call triggers a HubApi-internal init() call,
        // which is not resolved when the second call is done at the same time,
        // throwing a "Must call init() first" error (which then fails both requests).
        listedAccounts = await hubApi.list();
        listedCashlinks = await hubApi.cashlinks();
    } catch (error) {
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

    if (welcomeRoute) {
        router.push(welcomeRoute);
    }
}

export async function onboard(asRedirect = false) {
    if (asRedirect === true) {
        const behavior = new HubApi.RedirectRequestBehavior() as RequestBehavior<BehaviorType.REDIRECT>;
        hubApi.onboard({
            appName: APP_NAME,
            disableBack: true,
        }, behavior);
        return null;
    }

    const accounts = await hubApi.onboard({ appName: APP_NAME }).catch(onError);
    if (!accounts) return false;

    processAndStoreAccounts(accounts);

    if (accounts[0].btcAddresses && accounts[0].btcAddresses.external.length > 0) {
        router.push('/btc-activation/activated');
    }

    return true;
}

export async function addAddress(accountId: string) {
    const addedAddress = await hubApi.addAddress({
        appName: APP_NAME,
        accountId,
    }).catch(onError);
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
    }).catch(onError);
    if (!exportResult) return false;

    const accountStore = useAccountStore();
    accountStore.patchAccount(accountId, exportResult);

    return true;
}

export async function sendTransaction(tx: Omit<SignTransactionRequest, 'appName'>) {
    const signedTransaction = await hubApi.signTransaction({
        appName: APP_NAME,
        ...tx,
    }).catch(onError);
    if (!signedTransaction) return null;

    return sendTx(signedTransaction);
}

export async function createCashlink(senderAddress: string, senderBalance?: number) {
    const cashlink = await hubApi.createCashlink({
        appName: APP_NAME,
        senderAddress,
        senderBalance,
    }).catch(onError);
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
    }).catch(onError).catch((error: null | Error) => {
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
    }).catch(onError);
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
    }).catch(onError);
    if (!account) return false;

    processAndStoreAccounts([account]);

    return true;
}

export async function changePassword(accountId: string) {
    await hubApi.changePassword({
        appName: APP_NAME,
        accountId,
    }).catch(onError);
}

export async function logout(accountId: string) {
    const loggedOut = await hubApi.logout({
        appName: APP_NAME,
        accountId,
    }).catch(onError);
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

export async function sendBtcTransaction(tx: Omit<SignBtcTransactionRequest, 'appName'>) {
    const signedTransaction = await hubApi.signBtcTransaction({
        appName: APP_NAME,
        ...tx,
    }).catch(onError);
    if (!signedTransaction) return null;

    return sendBtcTx(signedTransaction);
}

export async function activateBitcoin(accountId: string) {
    const account = await hubApi.activateBitcoin({
        appName: APP_NAME,
        accountId,
    }).catch(onError);
    if (!account) return false;

    processAndStoreAccounts([account]);

    return true;
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
        used: false,
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

export async function setupSwap(requestPromise: Promise<Omit<SetupSwapRequest, 'appName'>>) {
    return hubApi.setupSwap(new Promise((resolve, reject) => {
        requestPromise.then((request) => resolve({
            ...request,
            appName: APP_NAME,
        })).catch(reject);
    })).catch(onError);
}

export async function refundSwap(requestPromise: Promise<Omit<RefundSwapRequest, 'appName'>>) {
    return hubApi.refundSwap(new Promise((resolve, reject) => {
        requestPromise.then((request) => resolve({
            ...request,
            appName: APP_NAME,
        })).catch(reject);
    })).catch(onError);
}
