import HubApi, { Account, ExportResult } from '@nimiq/hub-api'
import { useAccountStore, AccountInfo } from './stores/Account';
import { useAddressStore, AddressInfo, AddressType } from './stores/Address'
import { sendTransaction as sendTx } from './network';

const hubApi = new HubApi();

const APP_NAME = 'Wallet 2.0';

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
        if (account.accountId === 'c32d372d98b0') account.contracts.push({
            address: 'NQ17 9A8N TXK7 S4KC CRJP Q46Q VPY7 32KL QPYD',
            label: 'Vesting Contract',
            type: AddressType.VESTING,
            owner: 'NQ26 8MMT 8317 VD0D NNKE 3NVA GBVE UY1E 9YDF',
            start: 1,
            stepAmount: 50000e5,
            stepBlocks: 800000,
            totalAmount: 100000e5,
        });

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
    try {
        listedAccounts = await hubApi.list();
    } catch (error) {
        if (error.message === 'MIGRATION_REQUIRED') {
            // @ts-ignore Argument of type 'RedirectRequestBehavior' is not assignable to parameter of type 'RequestBehavior<BehaviorType.POPUP>'.
            hubApi.migrate(new HubApi.RedirectRequestBehavior());
            return;
        }

        // TODO: Handle this case with a user notification
        else if (error.message === 'ACCOUNTS_LOST') listedAccounts = [];

        // TODO: Handle error
        else throw error;
    }

    processAndStoreAccounts(listedAccounts, true);
}

export async function onboard() {
    let listedAccounts: Account[];

    try {
        listedAccounts = await hubApi.onboard({ appName: APP_NAME });
    } catch(error) {
        // TODO: Handle error
        throw error;
    }

    processAndStoreAccounts(listedAccounts);
}

export async function addAddress(accountId: string) {
    let addressInfo: AddressInfo;
    try {
        const addedAddress = await hubApi.addAddress({
            appName: APP_NAME,
            accountId,
        });

        addressInfo = {
            address: addedAddress.address,
            type: AddressType.BASIC,
            label: addedAddress.label,
            balance: null,
        };
    } catch(error) {
        // TODO: Handle error
        throw error;
    }

    const addressStore = useAddressStore();
    // Adding an AddressInfo automatically subscribes the address in the network
    addressStore.addAddressInfo(addressInfo, /* selectIt */ true);

    const accountStore = useAccountStore();
    accountStore.addAddressToAccount(accountId, addressInfo.address);
}

export async function backup(accountId: string, options: { wordsOnly?: boolean, fileOnly?: boolean }) {
    let exportResult: ExportResult;
    try {
        exportResult = await hubApi.export({
            appName: APP_NAME,
            accountId,
            ...options,
        });
    } catch(error) {
        // TODO: Handle error
        throw error;
    }

    const accountStore = useAccountStore();
    accountStore.patchAccount(accountId, exportResult);
}

export async function sendTransaction(tx: {
    sender: string,
    recipient: string,
    recipientType: 0 | 1 | 2 | undefined,
    recipientLabel: string,
    value: number,
    fee: number,
    extraData: Uint8Array,
    validityStartHeight: number,
}) {
    try {
        const signedTransaction = await hubApi.signTransaction({
            appName: APP_NAME,
            ...tx,
        });
        await sendTx(signedTransaction);
    } catch (error) {
        throw error;
    }

    return true;
}

export async function rename(accountId: string, address?: string) {
    let account: Account;
    try {
        account = await hubApi.rename({
            appName: APP_NAME,
            accountId,
            address,
        });
    } catch(error) {
        // TODO: Handle error
        throw error;
    }

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();

    accountStore.patchAccount(accountId, { label: account.label });
    for (const info of account.addresses.concat(account.contracts)) {
        addressStore.patchAddress(info.address, { label: info.label });
    }
}

export async function changePassword(accountId: string) {
    try {
        await hubApi.changePassword({
            appName: APP_NAME,
            accountId,
        });
    } catch(error) {
        // TODO: Handle error
        throw error;
    }
}

export async function logout(accountId: string) {
    alert('Logout is not yet possible');
    return;

    // eslint-disable-next-line no-unreachable
    try {
        await hubApi.logout({
            appName: APP_NAME,
            accountId,
        });
    } catch(error) {
        // TODO: Handle error
        throw error;
    }

    // TODO: Delete account, it's addresses, and their transactions
}
