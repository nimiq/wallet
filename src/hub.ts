import HubApi, { Account, SignTransactionRequest } from '@nimiq/hub-api';
import { RequestBehavior, BehaviorType } from '@nimiq/hub-api/dist/src/client/RequestBehavior.d';
import Config from 'config';
import { useAccountStore, AccountInfo } from './stores/Account';
import { useAddressStore, AddressInfo, AddressType } from './stores/Address';
import { useTransactionsStore } from './stores/Transactions';
import { useCashlinkStore, Cashlink } from './stores/Cashlink';
import { sendTransaction as sendTx } from './network';
import { isFundingCashlink, isClaimingCashlink } from './lib/CashlinkDetection';
import router from './router';

const hubApi = new HubApi(Config.hubEndpoint);

let welcomeRoute = '';

hubApi.on(HubApi.RequestType.ONBOARD, (accounts) => {
    if (!accounts[0].wordsExported && !accounts[0].fileExported) {
        // This was a signup (no export yet). The welcome slides are also shown for Ledger accounts,
        // which also have no exports.
        welcomeRoute = '/welcome';
    }
});

hubApi.on(HubApi.RequestType.MIGRATE, () => {
    welcomeRoute = '/migration-welcome';
});

hubApi.checkRedirectResponse();

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

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();

    for (const account of accounts) {
        const addresses: string[] = [];

        for (const address of account.addresses) {
            addresses.push(address.address);

            addressInfos.push({
                address: address.address,
                type: AddressType.BASIC,
                label: address.label,
                balance: addressStore.state.addressInfos[address.address]
                    ? addressStore.state.addressInfos[address.address].balance
                    : null,
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
                balance: addressStore.state.addressInfos[contract.address]
                    ? addressStore.state.addressInfos[contract.address].balance
                    : null,
            });
        }

        accountInfos.push({
            id: account.accountId,
            // @ts-ignore Type 'WalletType' is not assignable to type 'AccountType'. (WalletType is not exported.)
            type: account.type,
            label: account.label,
            fileExported: account.fileExported,
            wordsExported: account.wordsExported,
            addresses,
        });
    }

    if (replaceState) {
        accountStore.setAccountInfos(accountInfos);
        addressStore.setAddressInfos(addressInfos);
    } else {
        for (const accountInfo of accountInfos) {
            accountStore.addAccountInfo(accountInfo);
        }
        for (const addressInfo of addressInfos) {
            addressStore.addAddressInfo(addressInfo);
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
        onboard(true); // eslint-disable-line @typescript-eslint/no-use-before-define
        return;
    }

    processAndStoreAccounts(listedAccounts, true);

    if (listedCashlinks.length) {
        const cashlinkStore = useCashlinkStore();
        cashlinkStore.setHubCashlinks(listedCashlinks);
    }

    if (welcomeRoute) {
        router.push(welcomeRoute);
    }
}

export async function onboard(asRedirect = false) {
    if (asRedirect === true) {
        const behavior = new HubApi.RedirectRequestBehavior() as RequestBehavior<BehaviorType.REDIRECT>;
        hubApi.onboard({ appName: APP_NAME }, behavior);
        return;
    }

    const accounts = await hubApi.onboard({ appName: APP_NAME }).catch(onError);
    if (!accounts) return;

    processAndStoreAccounts(accounts);

    if (!accounts[0].wordsExported && !accounts[0].fileExported) {
        // This was a signup (no export yet). The welcome slides are also shown for Ledger accounts,
        // which also have no exports.
        router.push('/welcome');
    }
}

export async function addAddress(accountId: string) {
    const addedAddress = await hubApi.addAddress({
        appName: APP_NAME,
        accountId,
    }).catch(onError);
    if (!addedAddress) return;

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
}

export async function backup(accountId: string, options: { wordsOnly?: boolean, fileOnly?: boolean }) {
    const exportResult = await hubApi.export({
        appName: APP_NAME,
        accountId,
        ...options,
    }).catch(onError);
    if (!exportResult) return;

    const accountStore = useAccountStore();
    accountStore.patchAccount(accountId, exportResult);
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
    const cashlinkStore = useCashlinkStore();
    cashlinkStore.addHubCashlink(cashlink);

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
    const cashlinkStore = useCashlinkStore();
    cashlinkStore.addHubCashlink(cashlink);

    return true;
}

export async function rename(accountId: string, address?: string) {
    const account = await hubApi.rename({
        appName: APP_NAME,
        accountId,
        address,
    }).catch(onError);
    if (!account) return;

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();

    accountStore.patchAccount(accountId, { label: account.label });
    for (const info of account.addresses.concat(account.contracts)) {
        addressStore.patchAddress(info.address, { label: info.label });
    }
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
    if (!loggedOut) return;

    if (!loggedOut.success) return;

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();
    const transactionStore = useTransactionsStore();
    const cashlinkStore = useCashlinkStore();

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

    const pendingCashlinksToDelete = transactionsToDelete
        .map((tx) => {
            if (isFundingCashlink(tx.data.raw)) return tx.recipient;
            if (isClaimingCashlink(tx.data.raw)) return tx.sender;
            return '';
        })
        .filter((address) => Boolean(address));

    // Delete account, it's addresses, their transactions and cashlinks
    for (const cashlinkAddress of pendingCashlinksToDelete) {
        cashlinkStore.removeCashlink(cashlinkAddress);
    }
    transactionStore.removeTransactions(transactionsToDelete);
    addressStore.removeAddresses(addressesToDelete);
    accountStore.removeAccount(accountId);

    if (!Object.values(accountStore.state.accountInfos).length) {
        onboard(true);
    }
}
