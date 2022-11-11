import { createStore } from 'pinia';

export enum SEPA_INSTANT_SUPPORT {
    FULL = 'full',
    PARTIAL = 'partial', // some accounts support it, some don't, in the same bank
    NONE = 'no',
    UNKNOWN = 'unknown',

    FULL_OR_SHARED = 'full-or-shared', // all accounts support it, but some are using generic iban, some individual ones
}

export enum BANK_NETWORK {
    RT1 = 'rt1',
    TIPS = 'tips',
}

type DirectionSupport = {
    inbound: SEPA_INSTANT_SUPPORT,
    outbound: SEPA_INSTANT_SUPPORT,
}

export type Bank = {
    name: string,
    BIC: string,
    country: string, // ISO 3166-1 alpha-2 country code
    support: { // TODO: change this to be at least one, and not both optional (and remove ! in the code once it's done)
        rt1?: DirectionSupport,
        tips?: DirectionSupport,
    },
}

export type BankAccount = {
    accountName: string,
    iban: string,
}

export type BankState = {
    bank: Bank | null,
    bankAccount: BankAccount | null,
}

export const useBankStore = createStore({
    id: 'bank',
    state: (): BankState => ({
        bank: null,
        bankAccount: null,
    }),
    getters: {
        bank: (state): Readonly<Bank | null> => state.bank,
        bankAccount: (state): Readonly<BankAccount | null> => state.bankAccount,
    },
    actions: {
        setBank(bank: Bank) {
            if (bank.BIC !== this.state.bank?.BIC) {
                this.state.bankAccount = null;
            }
            this.state.bank = bank;
        },
        setBankAccount(bankAccount: BankAccount) {
            this.state.bankAccount = bankAccount;
        },
    },
});
