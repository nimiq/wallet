import { Account, Address, Contract } from '@nimiq/hub-api';

export enum AccountType {
    LEGACY = 1,
    BIP39 = 2,
    LEDGER = 3,
}

export type AccountInfo = Omit<Account, 'accountId' | 'type' | 'contracts' | 'addresses'> & {
    id: string,
    type: AccountType,
    addresses: string[],
}
