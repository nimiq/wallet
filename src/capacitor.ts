/* eslint-disable */

import type {
    Account,
    Cashlink,
    OnboardRequest,
    RequestType,
    SignedTransaction,
    SignTransactionRequest,
    SimpleRequest,
    SimpleResult,
    Address,
    SignedBtcTransaction,
    SignedPolygonTransaction,
    ExportRequest,
    CreateCashlinkRequest,
    ManageCashlinkRequest,
    RenameRequest,
    BasicRequest,
    SignBtcTransactionRequest,
    SignPolygonTransactionRequest,
    AddBtcAddressesRequest,
    SetupSwapRequest,
    RefundSwapRequest,
    AddBtcAddressesResult,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { FingerprintAIO, BIOMETRIC_ERRORS } from '@awesome-cordova-plugins/fingerprint-aio';
import idbReady from 'safari-14-idb-fix';
import {
    get as _idbGet,
    set as _idbSet,
    del as _idbDel,
    values as _idbValues,
    createStore as _idbCreateStore,
    UseStore as CustomStore,
} from 'idb-keyval';
import { loadNimiqJS } from './lib/NimiqJSLoader';

// TEMPORARY for proof-of-concept! Should use "Ionic Storage" with SQL driver:
// https://ionic.io/blog/choosing-a-data-storage-solution-ionic-storage-capacitor-storage-sqlite-or-ionic-secure-storage
const ACCOUNTS = _idbCreateStore('capacitor-accounts', 'keyval');
const META = _idbCreateStore('capacitor-meta', 'keyval');

class IndexedDBStorage {
    private static lastError = '';

    static async get<ResultType>(key: string, store: CustomStore) {
        return _idbGet<ResultType>(key, store);
    }

    static async values<ResultType>(store: CustomStore) {
        return _idbValues<ResultType>(store);
    }

    static async set(key: string, value: any, store: CustomStore) {
        try {
            return await _idbSet(key, value, store);
        } catch (error) {
            const message = error instanceof Error ? error.message : error as string;

            if (this.lastError !== message) {
                this.lastError = message;
                // TODO: Handle quota-errors with a user notification
                throw error;
            }
            return undefined;
        }
    }

    static async del(key: string, store: CustomStore) {
        return _idbDel(key, store);
    }
}

const DEFAULT_KEY_PATH = `m/44'/242'/0'/0'`;
const ERROR_CANCELED = 'CANCELED';

let storagePromise: Promise<typeof IndexedDBStorage>;
async function getStorage() {
    return storagePromise || (storagePromise = new Promise(async (res) => {
        await idbReady();
        return res(IndexedDBStorage);
    }));
}

type KeyRecord = {
    id: string,
    type: Nimiq.Secret.Type,
    encryptedSecret: Uint8Array,
};

type AddressRecord = {
    path: string,
    label: string,
    address: string,
};

enum AccountType {
    BIP39 = 2,
    // LEDGER = 3,
}

type AccountRecord = {
    id: string,
    uid: string,
    key: KeyRecord,
    label: string,
    addresses: Map</*address*/ string, AddressRecord>,
    // contracts: ContractInfoEntry[],
    type: AccountType,
    fileExported: boolean,
    wordsExported: boolean,
    // btcXPub?: string,
    // btcAddresses?: {
    //     internal: BtcAddressInfoEntry[],
    //     external: BtcAddressInfoEntry[],
    // },
    // polygonAddresses?: PolygonAddressEntry[],
};

type PromiseAllowed<T> = T | Promise<T>;

export default class NativeApi {
    public static readonly ACCOUNT_ID_LENGTH = 6;
    public static readonly SALT_LENGTH = 16;

    constructor() {}

    public async list(): Promise<Account[]> {
        const records = await this.listRecords();
        if (!records) return [];
        return records.map((record) => accountRecord2Account(record, 'list' as RequestType));
    }

    private async listRecords(): Promise<AccountRecord[]> {
        // TODO: Require biometric authentication with FingerprintAIO.show()?
        const storage = await getStorage();
        const records = await storage.values<AccountRecord>(ACCOUNTS);
        if (!records) return [];
        return records;
    }

    public async cashlinks(): Promise<Cashlink[]> { return []; }

    // Stub against type error
    public migrate(): void {}

    public async onboard(request: OnboardRequest): Promise<Account[]> {
        try {
            await FingerprintAIO.isAvailable(); // Throws if not available
        } catch (error: any) {
            alert(`Biometric authentication is not available: ${error.message}`);
            throw error;
        }

        // TODO: Choose between create and login

        await loadNimiqJS();
        const entropy = Nimiq.Entropy.generate();
        const keyId = await makeKeyId(entropy);
        const firstAddress = entropy.toExtendedPrivateKey().derivePath(DEFAULT_KEY_PATH).toAddress().toUserFriendlyAddress();
        const addresses = new Map([[firstAddress, <AddressRecord> {
            path: DEFAULT_KEY_PATH,
            label: 'Default',
            address: firstAddress,
        }]]);

        // Generate a random password
        const password = Nimiq.BufferUtils.toBase64(Nimiq.Entropy.generate().serialize());

        // Alternatively, prompt the user for a password
        // const password = window.prompt('Please enter a password to encrypt your Account:');
        // if (!password) throw new Error(ERROR_CANCELED);

        // Store password in Keychain
        try {
            await FingerprintAIO.registerBiometricSecret({
                title: 'Authenticate to store account',
                secret: password,
            });
        } catch (error: any) {
            if (![BIOMETRIC_ERRORS.BIOMETRIC_DISMISSED, BIOMETRIC_ERRORS.BIOMETRIC_PIN_OR_PATTERN_DISMISSED].includes(error.code)) {
                alert(`Could not store account: ${error.message}`);
                throw error;
            }
            throw new Error(ERROR_CANCELED);
        }

        const record = <AccountRecord> {
            id: await this.deriveId(keyId),
            uid: await makeUid(keyId, firstAddress),
            key: {
                id: keyId,
                type: Nimiq.Secret.Type.ENTROPY,
                encryptedSecret: new Uint8Array(await entropy.exportEncrypted(Nimiq.BufferUtils.fromUtf8(password))),
            },
            label: 'Default',
            addresses,
            type: AccountType.BIP39,
            fileExported: false,
            wordsExported: false,
        };
        const storage = await getStorage();
        await storage.set(record.id, record, ACCOUNTS);

        return [accountRecord2Account(record, 'onboard' as RequestType)];
    }

    public async signTransaction(request: SignTransactionRequest): Promise<SignedTransaction> {
        // Find account from sender address
        const records = await this.listRecords();
        const record = records.find((record) => record.addresses.has(request.sender));
        if (!record) throw new Error('Account not found');
        const addressRecord = record.addresses.get(request.sender)!;

        // Get password from Keychain
        let password: string;
        try {
            password = await FingerprintAIO.loadBiometricSecret({
                title: 'Unlock to sign',
            });
        } catch (error: any) {
            if (![BIOMETRIC_ERRORS.BIOMETRIC_DISMISSED, BIOMETRIC_ERRORS.BIOMETRIC_PIN_OR_PATTERN_DISMISSED].includes(error.code)) {
                alert(`Could not unlock account: ${error.message}`);
                throw error;
            }
            throw new Error(ERROR_CANCELED);
        }

        const entropy = await Nimiq.Secret.fromEncrypted(
            new Nimiq.SerialBuffer(record.key.encryptedSecret),
            Nimiq.BufferUtils.fromUtf8(password),
        ) as Nimiq.Entropy;

        const privateKey = entropy.toExtendedPrivateKey().derivePath(addressRecord.path).privateKey;
        const publicKey = Nimiq.PublicKey.derive(privateKey);

        const tx = new Nimiq.ExtendedTransaction(
            Nimiq.Address.fromAny(request.sender),
            Nimiq.Account.Type.BASIC,
            Nimiq.Address.fromAny(request.recipient),
            request.recipientType || Nimiq.Account.Type.BASIC,
            request.value,
            request.fee || 0,
            request.validityStartHeight,
            request.flags || Nimiq.Transaction.Flag.NONE,
            typeof request.extraData === 'string'
                ? Nimiq.BufferUtils.fromAny(request.extraData)
                : request.extraData || new Uint8Array(0),
        );

        const signature = Nimiq.Signature.create(privateKey, publicKey, tx.serializeContent());
        const proof = Nimiq.SignatureProof.singleSig(publicKey, signature);
        tx.proof = proof.serialize();

        return <SignedTransaction> {
            serializedTx: Nimiq.BufferUtils.toHex(tx.serialize()),
            hash: tx.hash().toHex(),
            raw: {
                signerPublicKey: publicKey.serialize(),
                signature: signature.serialize(),
                sender: tx.sender.toUserFriendlyAddress(),
                senderType: tx.senderType,
                recipient: tx.recipient.toUserFriendlyAddress(),
                recipientType: tx.recipientType,
                value: tx.value,
                fee: tx.fee,
                validityStartHeight: tx.validityStartHeight,
                extraData: tx.data,
                flags: tx.flags,
                networkId: tx.networkId,
                proof: tx.proof,
            },
        };
    }

    public async logout(request: SimpleRequest): Promise<SimpleResult> {
        const really = window.confirm('Do you really want to log out?');
        if (!really) throw new Error(ERROR_CANCELED);
        const storage = await getStorage();
        await storage.del(request.accountId, ACCOUNTS);
        return { success: true };
    }

    // @ts-expect-error implementation missing
    public async addAddress(request: SimpleRequest): Promise<Address> {}

    // @ts-expect-error implementation missing
    public async export(request: ExportRequest): Promise<ExportResult> {}

    // @ts-expect-error implementation missing
    public async createCashlink(request: CreateCashlinkRequest): Promise<Cashlink> {}

    // @ts-expect-error implementation missing
    public async manageCashlink(request: ManageCashlinkRequest): Promise<Cashlink> {}

    // @ts-expect-error implementation missing
    public async rename(request: RenameRequest): Promise<Account> {}

    // @ts-expect-error implementation missing
    public async addVestingContract(request: BasicRequest): Promise<Account> {}

    // @ts-expect-error implementation missing
    public async changePassword(request: SimpleRequest): Promise<SimpleResult> {}

    // @ts-expect-error implementation missing
    public async signBtcTransaction(request: SignBtcTransactionRequest): Promise<SignedBtcTransaction> {}

    // @ts-expect-error implementation missing
    public async activateBitcoin(request: SimpleRequest): Promise<Account> {}

    // @ts-expect-error implementation missing
    public async activatePolygon(request: SimpleRequest): Promise<Account> {}

    // @ts-expect-error implementation missing
    public async signPolygonTransaction(request: PromiseAllowed<SignPolygonTransactionRequest>): Promise<SignedPolygonTransaction> {}

    // @ts-expect-error implementation missing
    public async addBtcAddresses(request: AddBtcAddressesRequest): Promise<AddBtcAddressesResult> {}

    // @ts-expect-error implementation missing
    public async setupSwap(request: PromiseAllowed<SetupSwapRequest>): Promise<SetupSwapResult> {}

    // @ts-expect-error implementation missing
    public async refundSwap(request: PromiseAllowed<RefundSwapRequest>): Promise<SignedTransaction | SignedBtcTransaction | SignedPolygonTransaction> {}

    private async deriveId(keyId: string): Promise<string> {
        const accounts = await this.listRecords();
        const existingAccount = accounts.find((account) => account.key.id === keyId);
        if (existingAccount) return existingAccount.id;

        const existingIds = accounts.map((account) => account.id);
        const keyIdBytes = Nimiq.BufferUtils.fromBase64(keyId);

        // Hashing with a random salt that does not leave the wallet to avoid that an external app can derive
        // account IDs from public keys (Legacy and Ledger accounts) or get a hint for private key guessing / brute
        // forcing (for BIP39) as hashing the private key is cheaper than deriving the public key.
        const salt = await this._getSalt();
        const saltedKeyIdBytes = new Uint8Array(keyIdBytes.length + salt.length);
        saltedKeyIdBytes.set(keyIdBytes, 0);
        saltedKeyIdBytes.set(salt, keyIdBytes.length);
        await loadNimiqJS();
        const keyIdHash = Nimiq.Hash.computeBlake2b(saltedKeyIdBytes);

        for (let i = 0; i <= (keyIdHash.length - NativeApi.ACCOUNT_ID_LENGTH); i++) {
            const id = Nimiq.BufferUtils.toHex(keyIdHash.subarray(i, i + NativeApi.ACCOUNT_ID_LENGTH));
            if (existingIds.indexOf(id) === -1) return id;
        }

        // Could not find an available account ID in the searched space.
        // Recurse with the hashed value.
        return this.deriveId(Nimiq.BufferUtils.toBase64(keyIdHash));
    }

    private async _getSalt() {
        let salt = await this._getMetaData('salt');
        if (salt) return salt;
        salt = new Uint8Array(NativeApi.SALT_LENGTH);
        window.crypto.getRandomValues(salt);
        await this._putMetaData('salt', salt);
        return salt;
    }

    private async _getMetaData(name: string): Promise<Uint8Array | undefined> {
        const storage = await getStorage();
        return storage.get<Uint8Array>(name, META);
    }

    private async _putMetaData(name: string, value: Uint8Array): Promise<void> {
        const storage = await getStorage();
        return storage.set(name, value, META);
    }
}

function accountRecord2Account(record: AccountRecord, requestType: RequestType): Account {
    return {
        accountId: record.id,
        label: record.label,
        type: record.type,
        fileExported: record.fileExported,
        wordsExported: record.wordsExported,
        addresses: [...record.addresses.values()].map((addressRecord) => ({
            address: addressRecord.address,
            label: addressRecord.label,
        })),
        contracts: [],
        btcAddresses: {
            internal: [],
            external: [],
        },
        polygonAddresses: [],
        uid: record.uid,
        requestType,
    }
}

async function makeKeyId(entropy: Nimiq.Entropy): Promise<string> {
    await loadNimiqJS();
    return Nimiq.Hash.blake2b(entropy.serialize()).toBase64();
}

async function makeUid(keyId: string, firstAddress: string): Promise<string> {
    return Nimiq.BufferUtils.toHex(
        await sha256(
            Nimiq.BufferUtils.fromAscii(`Nimiq UID: ${keyId} ${firstAddress}`),
        ),
    );
}

/**
 * This method uses only browser-native APIs to avoid loading the Nimiq or Bitcoin library, as this
 * method is also used in the iframe.
 */
async function sha256(buffer: Uint8Array): Promise<Uint8Array> {
    try {
        return new Uint8Array(await window.crypto.subtle.digest('SHA-256', buffer));
    } catch (error) {
        if (window.top === window) { // Not an iframe or popup
            await loadNimiqJS();
            return Nimiq.Hash.computeSha256(buffer);
        } else {
            throw error;
        }
    }
}
